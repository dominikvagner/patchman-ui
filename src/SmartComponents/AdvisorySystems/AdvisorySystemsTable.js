import React, { Fragment } from 'react';
import { TableVariant } from '@patternfly/react-table';
import { InventoryTable } from '@redhat-cloud-services/frontend-components/Inventory';
import propTypes from 'prop-types';
import { shallowEqual, useDispatch, useSelector, useStore } from 'react-redux';
import { combineReducers } from 'redux';
import messages from '../../Messages';
import searchFilter from '../../PresentationalComponents/Filters/SearchFilter';
import { defaultReducers } from '../../store';
import { systemSelectAction } from '../../store/Actions/Actions';
import {
  inventoryEntitiesReducer,
  modifyAdvisorySystems,
} from '../../store/Reducers/InventoryEntitiesReducer';
import {
  exportAdvisorySystemsCSV,
  exportAdvisorySystemsJSON,
  fetchAdvisorySystems,
} from '../../Utilities/api/api';
import { remediationIdentifiers } from '../../Utilities/constants';
import {
  arrayFromObj,
  buildApiFilters,
  buildResetFilterState,
  encodeURLParams,
  matchesDefaultState,
  persistantParams,
  remediationProvider,
  removeUndefinedObjectKeys,
} from '../../Utilities/Helpers';
import {
  useBulkSelectConfig,
  useGetEntities,
  useOnExport,
  useRemoveFilter,
  useOnSelect,
  ID_API_ENDPOINTS,
  useColumnManagement,
} from '../../Utilities/hooks';
import { intl } from '../../Utilities/IntlProvider';
import { ADVISORY_SYSTEMS_COLUMNS, systemsRowActions } from '../Systems/SystemsListAssets';
import AsyncRemediationButton from '../Remediation/AsyncRemediationButton';
import {
  buildActiveFiltersConfig,
  mergeInventoryColumns,
} from '../../Utilities/SystemsHelpers';
import advisoryStatusFilter from '../../PresentationalComponents/Filters/AdvisoryStatusFilter';

const AdvisorySystemsTable = ({
  advisoryName,
  apply,
  setSearchParams,
  activateRemediationModal,
  decodedParams,
}) => {
  const dispatch = useDispatch();
  const store = useStore();

  const systems = useSelector(({ entities }) => entities?.rows || [], shallowEqual);
  const totalItems = useSelector(({ entities }) => entities?.total || 0);
  const queryParams = useSelector(
    ({ AdvisorySystemsStore }) => AdvisorySystemsStore?.queryParams || {},
  );
  const selectedRows = useSelector(({ entities }) => entities?.selectedRows || []);

  const {
    systemProfile,
    selectedTags,
    filter = {},
    search = '',
    page,
    perPage,
    sort,
  } = queryParams;

  const [appliedColumns, setAppliedColumns] = React.useState(ADVISORY_SYSTEMS_COLUMNS);
  const [ColumnManagementModal, setColumnManagementModalOpen] = useColumnManagement(
    appliedColumns,
    (newColumns) => setAppliedColumns(newColumns),
  );

  const patchFilters = React.useMemo(() => {
    const nextPatchFilters = { ...filter };
    delete nextPatchFilters.os;
    delete nextPatchFilters.group_name;
    return nextPatchFilters;
  }, [filter]);
  const inventoryFilters = React.useMemo(() => {
    const { os, group_name } = decodedParams?.filter || {};

    return {
      ...(os !== undefined ? { os } : {}),
      ...(group_name !== undefined ? { group_name } : {}),
    };
  }, [decodedParams]);
  const currentResetState = React.useMemo(
    () => ({
      filter: { ...patchFilters, ...inventoryFilters },
      search,
      ...(decodedParams?.tags !== undefined ? { tags: decodedParams.tags } : {}),
    }),
    [decodedParams, inventoryFilters, patchFilters, search],
  );
  const shouldShowDeleteButton = !matchesDefaultState(currentResetState, {});
  const currentQueryParams = React.useMemo(
    () => ({
      ...queryParams,
      filter: buildApiFilters(patchFilters, {
        osFilter: decodedParams?.filter?.os,
        hostGroupFilter: decodedParams?.filter?.group_name,
      }),
    }),
    [decodedParams, patchFilters, queryParams],
  );

  const [deleteFilters] = useRemoveFilter({ search, ...patchFilters }, apply);
  const handleDeleteFilters = React.useCallback(
    (event, selected, shouldReset) => {
      if (shouldReset) {
        const resetPatchState = buildResetFilterState({ filter: patchFilters, search });
        const nextParams = { ...(decodedParams || {}) };

        delete nextParams.filter;
        delete nextParams.search;
        delete nextParams.tags;

        setSearchParams(encodeURLParams(nextParams), { replace: true });
        apply(resetPatchState);
        return;
      }

      deleteFilters(event, selected);
    },
    [apply, decodedParams, deleteFilters, patchFilters, search, setSearchParams],
  );

  const filterConfig = {
    items: [
      searchFilter(
        apply,
        search,
        intl.formatMessage(messages.labelsFiltersSystemsSearchTitle),
        intl.formatMessage(messages.labelsFiltersSystemsSearchPlaceholder),
      ),
      advisoryStatusFilter(apply, patchFilters),
    ],
  };

  const activeFiltersConfig = buildActiveFiltersConfig(
    patchFilters,
    search,
    handleDeleteFilters,
    shouldShowDeleteButton,
    messages.labelsFiltersClear,
  );

  const onSelect = useOnSelect(systems, selectedRows, {
    endpoint: ID_API_ENDPOINTS.advisorySystems(advisoryName),
    queryParams: currentQueryParams,
    selectionDispatcher: systemSelectAction,
    totalItems,
  });

  const selectedCount = selectedRows && arrayFromObj(selectedRows).length;

  const getEntites = useGetEntities(
    fetchAdvisorySystems,
    apply,
    { id: advisoryName },
    setSearchParams,
  );

  const onExport = useOnExport(
    advisoryName,
    currentQueryParams,
    {
      csv: exportAdvisorySystemsCSV,
      json: exportAdvisorySystemsJSON,
    },
    dispatch,
  );

  const remediationDataProvider = () =>
    remediationProvider(
      advisoryName,
      removeUndefinedObjectKeys(selectedRows),
      remediationIdentifiers.advisory,
    );

  const bulkSelectConfig = useBulkSelectConfig(
    selectedCount,
    onSelect,
    { total_items: totalItems },
    systems,
    null,
    currentQueryParams,
  );

  return (
    <Fragment>
      {ColumnManagementModal}

      <InventoryTable
        isFullView
        autoRefresh
        initialLoading
        ignoreRefresh
        hideFilters={{ all: true, tags: false, hostGroupFilter: false, operatingSystem: false }}
        columns={(inventoryColumns) =>
          mergeInventoryColumns(
            appliedColumns.filter((column) => column.isShown),
            inventoryColumns,
          )
        }
        showTags
        customFilters={{
          patchParams: {
            search,
            filter: patchFilters,
            systemProfile,
            selectedTags,
          },
        }}
        paginationProps={{
          isDisabled: totalItems === 0,
        }}
        onLoad={({ mergeWithEntities }) => {
          store.replaceReducer(
            combineReducers({
              ...defaultReducers,
              ...mergeWithEntities(
                inventoryEntitiesReducer(ADVISORY_SYSTEMS_COLUMNS, modifyAdvisorySystems),
                persistantParams({ page, perPage, sort, search }, decodedParams),
              ),
            }),
          );
        }}
        getEntities={getEntites}
        actionsConfig={{
          actions: [
            null, // first item of actions will be a big button, but we want "Manage columns" in kebab menu
            {
              label: 'Manage columns',
              onClick: () => setColumnManagementModalOpen(true),
            },
          ],
        }}
        tableProps={{
          actionResolver: (row) =>
            systemsRowActions(activateRemediationModal, undefined, undefined, row),
          canSelectAll: false,
          variant: TableVariant.compact,
          className: 'patchCompactInventory',
          isStickyHeader: true,
        }}
        filterConfig={filterConfig}
        activeFiltersConfig={activeFiltersConfig}
        exportConfig={{
          isDisabled: totalItems === 0,
          onSelect: onExport,
        }}
        bulkSelect={onSelect && bulkSelectConfig}
        dedicatedAction={
          <AsyncRemediationButton
            remediationProvider={remediationDataProvider}
            isDisabled={arrayFromObj(selectedRows).length === 0}
            hasSelected={arrayFromObj(selectedRows).length > 0}
          />
        }
      />
    </Fragment>
  );
};

AdvisorySystemsTable.propTypes = {
  advisoryName: propTypes.string,
  apply: propTypes.func,
  setSearchParams: propTypes.func,
  activateRemediationModal: propTypes.func,
  decodedParams: propTypes.object,
};

export default AdvisorySystemsTable;
