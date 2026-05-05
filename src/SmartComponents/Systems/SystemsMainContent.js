import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Main } from '@redhat-cloud-services/frontend-components/Main';
import { useSelector, useDispatch } from 'react-redux';
import ErrorHandler from '../../PresentationalComponents/Snippets/ErrorHandler';
import { changeSystemsParams, clearInventoryReducer } from '../../store/Actions/Actions';
import { decodeQueryparams } from '../../Utilities/Helpers';
import { useActivateRemediationModal } from './SystemsListAssets';
import SystemsStatusReport from '../../PresentationalComponents/StatusReports/SystemsStatusReport';
import RemediationWizard from '../Remediation/RemediationWizard';
import SystemsTable from './SystemsTable';
import { useSearchParams } from 'react-router-dom';

const SystemsMainContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const [isRemediationOpen, setRemediationOpen] = useState(false);
  const searchParamsString = searchParams.toString();
  const decodedParams = useMemo(
    () => decodeQueryparams('?' + searchParamsString),
    [searchParamsString],
  );
  const [remediationIssues, setRemediationIssues] = useState([]);

  const { hasError, code } = useSelector(({ entities }) => entities?.status || {});
  const metadata = useSelector(({ SystemsStore }) => SystemsStore?.metadata || {});
  const queryParams = useSelector(({ SystemsStore }) => SystemsStore?.queryParams || {});
  const apply = React.useCallback(
    (params) => {
      dispatch(changeSystemsParams(params));
    },
    [dispatch],
  );

  useLayoutEffect(() => {
    apply(decodedParams);
  }, [apply, decodedParams]);

  useEffect(() => () => dispatch(clearInventoryReducer()), [dispatch]);

  const activateRemediationModal = useActivateRemediationModal(
    setRemediationIssues,
    setRemediationOpen,
  );

  if (hasError || metadata?.has_systems === false) {
    return <ErrorHandler code={code} metadata={metadata} />;
  }

  return (
    <React.Fragment>
      <SystemsStatusReport apply={apply} queryParams={queryParams} />
      {(isRemediationOpen && (
        <RemediationWizard
          data={remediationIssues}
          isRemediationOpen
          setRemediationOpen={setRemediationOpen}
        />
      )) ||
        null}
      <Main>
        <SystemsTable
          apply={apply}
          activateRemediationModal={activateRemediationModal}
          decodedParams={decodedParams}
          setSearchParams={setSearchParams}
        />
      </Main>
    </React.Fragment>
  );
};

export default SystemsMainContent;
