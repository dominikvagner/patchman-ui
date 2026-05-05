import { conditionalFilterType } from '@redhat-cloud-services/frontend-components/ConditionalFilter';
import { packagesListUpdatableTypes } from '../../Utilities/constants';
import { intl } from '../../Utilities/IntlProvider';
import messages from '../../Messages';

const packagesListStatusFilter = (apply, currentFilter = {}) => {
  let { systems_applicable: currentValue } = currentFilter;
  const currentValueStringType =
    currentValue &&
    ((Array.isArray(currentValue) && currentValue.map((value) => value.toString())) || [
      currentValue.toString(),
    ]);

  const filterByType = (value) => {
    apply({ filter: { systems_applicable: value } });
  };

  return {
    label: intl.formatMessage(messages.labelsFiltersUpdatable),
    type: conditionalFilterType.checkbox,
    filterValues: {
      onChange: (event, value) => {
        filterByType(value);
      },
      items: packagesListUpdatableTypes,
      value: currentValueStringType,
      placeholder: intl.formatMessage(messages.labelsFiltersUpdatablePlaceholder),
    },
  };
};

export default packagesListStatusFilter;
