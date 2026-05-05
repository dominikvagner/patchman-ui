import React, { Fragment, useRef } from 'react';
import { TableVariant } from '@patternfly/react-table';
import { InventoryTable } from '@redhat-cloud-services/frontend-components/Inventory';
import { shallowEqual, useDispatch, useSelector, useStore } from 'react-redux';
import { defaultReducers } from '../../store';
import { changeSystemsMetadata, changeTags, systemSelectAction } from '../../store/Actions/Actions';
import {
  inventoryEntitiesReducer,
  modifyInventory,
} from '../../store/Reducers/InventoryEntitiesReducer';
import { exportSystemsCSV, exportSystemsJSON, fetchSystems } from '../../Utilities/api/api';
import { systemsListDefaultFilters, NO_ADVISORIES_TEXT } from '../../Utilities/constants';
import {
  arrayFromObj,
  buildResetFilterState,
  encodeURLParams,
  matchesDefaultState,
  persistantParams,
} from '../../Utilities/Helpers';
import {
  useBulkSelectConfig,
  useGetEntities,
  useOnExport,
  useRemoveFilter,
  useRemediationDataProvider,
  useOnSelect,
  ID_API_ENDPOINTS,
  useColumnManagement,
} from '../../Utilities/hooks';
import { SYSTEMS_LIST_COLUMNS, systemsRowActions } from './SystemsListAssets';
import AsyncRemediationButton from '../Remediation/AsyncRemediationButton';
import {
  buildFilterConfig,
  buildActiveFiltersConfig,
  mergeInventoryColumns,
} from '../../Utilities/SystemsHelpers';
import { combineReducers } from 'redux';
import propTypes from 'prop-types';

const SystemsTable = ({ apply, setSearchParams, activateRemediationModal, decodedParams }) => {
  const store = useStore();
  const inventory = useRef(null);

  const dispatch = useDispatch();
  const [isRemediationLoading, setRemediationLoading] = React.useState(false);
  const [isResetPending, setResetPending] = React.useState(false);
  const systems = useSelector(({ entities }) => entities?.rows || [], shallowEqual);
  const totalItems = useSelector(({ entities }) => entities?.total || 0);
  const isLoading = useSelector(({ entities }) => entities?.status?.isLoading);
  const queryParams = useSelector(({ SystemsStore }) => SystemsStore?.queryParams || {});

  const selectedRows = useSelector(({ entities }) => entities?.selectedRows || []);
  const areAllSelected = useSelector(({ SystemsStore }) => SystemsStore?.areAllSelected);

  const [appliedColumns, setAppliedColumns] = React.useState(SYSTEMS_LIST_COLUMNS);
  const [ColumnManagementModal, setColumnManagementModalOpen] = useColumnManagement(
    appliedColumns,
    (newColumns) => setAppliedColumns(newColumns),
  );

  const {
    systemProfile,
    selectedTags,
    filter: queryParamsFilter = {},
    search = '',
    page,
    perPage,
    sort,
  } = queryParams;
  const patchFilters = React.useMemo(() => {
    const nextPatchFilters = { ...queryParamsFilter };
    delete nextPatchFilters.os;
    delete nextPatchFilters.group_name;
    return nextPatchFilters;
  }, [queryParamsFilter]);
  const inventoryFilters = React.useMemo(() => {
    const { os, group_name } = decodedParams?.filter || {};

    return {
      ...(os !== undefined ? { os } : {}),
      ...(group_name !== undefined ? { group_name } : {}),
    };
  }, [decodedParams]);
  const operatingSystemFilter = [].concat(inventoryFilters.os || []).filter(Boolean);
  const currentSystemsResetState = React.useMemo(
    () => ({
      filter: { ...patchFilters, ...inventoryFilters },
      search,
      ...(decodedParams?.tags !== undefined ? { tags: decodedParams.tags } : {}),
    }),
    [decodedParams, inventoryFilters, patchFilters, search],
  );
  const defaultSystemsResetState = React.useMemo(
    () => ({
      filter: systemsListDefaultFilters.filter,
      search: systemsListDefaultFilters.search ?? '',
    }),
    [],
  );
  const shouldShowResetButton =
    !isResetPending && !matchesDefaultState(currentSystemsResetState, defaultSystemsResetState);
  const osFilter = operatingSystemFilter.length > 0 && [
    {
      osFilter: operatingSystemFilter.reduce((osFilter, os) => {
        const [osName, osVersion] = os.split(' ');
        const [major] = osVersion.split('.');

        return {
          ...osFilter,
          [`${osName}-${major}`]: {
            ...(osFilter[`${osName}-${major}`] || {}),
            [`${osName}-${major}-${osVersion}`]: true,
          },
        };
      }, {}),
    },
  ];

  const applyMetadata = (metadata) => {
    dispatch(changeSystemsMetadata(metadata));
  };

  const applyGlobalFilter = (tags) => {
    dispatch(changeTags(tags));
  };

  const [deleteFilters] = useRemoveFilter({ ...patchFilters, search }, apply);
  const handleResetFilters = React.useCallback(() => {
    const resetPatchState = buildResetFilterState(
      { filter: patchFilters, search },
      systemsListDefaultFilters,
    );
    const nextParams = { ...(decodedParams || {}) };

    setResetPending(true);
    delete nextParams.filter;
    delete nextParams.search;
    delete nextParams.tags;

    setSearchParams(encodeURLParams({ ...nextParams, ...resetPatchState }), { replace: true });
    apply(resetPatchState);
  }, [apply, decodedParams, patchFilters, search, setSearchParams]);
  const handleDeleteFilters = React.useCallback(
    (event, selected, shouldReset) => {
      if (shouldReset) {
        handleResetFilters();
        return;
      }

      deleteFilters(event, selected);
    },
    [deleteFilters, handleResetFilters],
  );

  React.useEffect(() => {
    if (
      isResetPending &&
      !isLoading &&
      matchesDefaultState(currentSystemsResetState, defaultSystemsResetState)
    ) {
      setResetPending(false);
    }
  }, [currentSystemsResetState, defaultSystemsResetState, isLoading, isResetPending]);

  const filterConfig = buildFilterConfig(search, patchFilters, apply);

  const activeFiltersConfig = buildActiveFiltersConfig(
    patchFilters,
    search,
    handleDeleteFilters,
    shouldShowResetButton,
  );

  const onSelect = useOnSelect(systems, selectedRows, {
    endpoint: ID_API_ENDPOINTS.systems,
    queryParams,
    selectionDispatcher: systemSelectAction,
    totalItems,
  });

  const onExport = useOnExport(
    'systems',
    queryParams,
    {
      csv: exportSystemsCSV,
      json: exportSystemsJSON,
    },
    dispatch,
  );

  const getEntities = useGetEntities(
    fetchSystems,
    apply,
    {},
    setSearchParams,
    applyMetadata,
    applyGlobalFilter,
  );

  const remediationDataProvider = useRemediationDataProvider(
    selectedRows,
    setRemediationLoading,
    'systems',
    areAllSelected,
  );

  const selectedCount = selectedRows && arrayFromObj(selectedRows).length;

  const bulkSelectConfig = useBulkSelectConfig(
    selectedCount,
    onSelect,
    { total_items: totalItems },
    systems,
  );

  return (
    <Fragment>
      {ColumnManagementModal}

      <InventoryTable
        ref={inventory}
        isFullView
        autoRefresh
        initialLoading
        hideFilters={{ all: true, tags: false, hostGroupFilter: false, operatingSystem: false }}
        columns={(inventoryColumns) =>
          mergeInventoryColumns(
            appliedColumns.filter((column) => column.isShown),
            inventoryColumns,
          )
        }
        showTags
        customFilters={{
          ...(operatingSystemFilter.length > 0
            ? {
                filters: [...(osFilter || [])],
              }
            : {}),
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
                inventoryEntitiesReducer(SYSTEMS_LIST_COLUMNS, modifyInventory),
                persistantParams({ page, perPage, sort, search }, decodedParams),
              ),
            }),
          );
        }}
        getEntities={getEntities}
        tableProps={{
          actionResolver: (row) => systemsRowActions(activateRemediationModal, row),
          canSelectAll: false,
          variant: TableVariant.compact,
          className: 'patchCompactInventory',
          isStickyHeader: true,
        }}
        bulkSelect={bulkSelectConfig}
        exportConfig={{
          isDisabled: totalItems === 0,
          onSelect: onExport,
        }}
        actionsConfig={{
          actions: [
            <AsyncRemediationButton
              key='remediate-multiple-systems'
              remediationProvider={remediationDataProvider}
              isDisabled={arrayFromObj(selectedRows).length === 0 || isRemediationLoading}
              isLoading={isRemediationLoading}
              patchNoAdvisoryText={NO_ADVISORIES_TEXT}
              hasSelected={arrayFromObj(selectedRows).length > 0}
            />,
            {
              label: 'Manage columns',
              onClick: () => setColumnManagementModalOpen(true),
            },
          ],
        }}
        filterConfig={filterConfig}
        activeFiltersConfig={activeFiltersConfig}
      />
    </Fragment>
  );
};

SystemsTable.propTypes = {
  apply: propTypes.func.isRequired,
  setSearchParams: propTypes.func.isRequired,
  activateRemediationModal: propTypes.func.isRequired,
  decodedParams: propTypes.object,
};
export default SystemsTable;
