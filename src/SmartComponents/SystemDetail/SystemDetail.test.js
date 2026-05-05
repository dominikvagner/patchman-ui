import SystemDetail from './SystemDetail';
import { useLocation, BrowserRouter as Router } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, screen } from '@testing-library/react';
import { systemAdvisoryRows, systemPackages } from '../../Utilities/RawDataForTesting';
import { storeListDefaults } from '../../Utilities/constants';
import '@testing-library/jest-dom';

const mockState = {
  metadata: {
    limit: 25,
    offset: 0,
    total_items: 10,
  },
  expandedRows: {},
  selectedRows: { 'RHSA-2020:2774': true },
  queryParams: {},
  error: {},
  status: {},
  rows: systemAdvisoryRows,
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => () => {}),
}));

const initStore = (state) => {
  const customMiddleWare = () => (next) => (action) => {
    useSelector.mockImplementation((callback) => callback({ SystemAdvisoryListStore: state }));
    next(action);
  };

  const mockStore = configureStore([customMiddleWare]);
  return mockStore({ SystemAdvisoryListStore: state });
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({ state: {} })),
}));
let store = initStore(mockState);

describe('SystemDetail.js', () => {
  beforeEach(() => {
    useLocation.mockImplementation(() => ({ state: {} }));
    useSelector.mockImplementation((callback) =>
      callback({
        SystemAdvisoryListStore: mockState,
        SystemPackageListStore: { ...storeListDefaults, rows: systemPackages },
      }),
    );
  });

  it('shows advisories by default', () => {
    render(
      <Provider store={store}>
        <Router>
          <SystemDetail inventoryId='test' />
        </Router>
      </Provider>,
    );

    expect(screen.getByRole('tab', { name: /advisories/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /packages/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('shows packages when package tab is requested in location state', () => {
    useLocation.mockImplementation(() => ({ state: { tab: 'packages' } }));

    render(
      <Provider store={store}>
        <Router>
          <SystemDetail inventoryId='test' />
        </Router>
      </Provider>,
    );

    expect(screen.getByRole('tab', { name: /packages/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /advisories/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});
