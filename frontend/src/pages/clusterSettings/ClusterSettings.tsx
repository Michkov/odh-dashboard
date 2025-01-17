import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Button,
  ButtonVariant,
  Checkbox,
  TextVariants,
  InputGroup,
  InputGroupText,
  InputGroupTextVariant,
  Text,
  TextInput,
  HelperText,
  HelperTextItem,
  Radio,
  ValidatedOptions,
  Stack,
  StackItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAppContext } from '~/app/AppContext';
import { fetchClusterSettings, updateClusterSettings } from '~/services/clusterSettingsService';
import { ClusterSettings, NotebookTolerationFormSettings } from '~/types';
import { addNotification } from '~/redux/actions/actions';
import { getTimeoutByHourAndMinute, getHourAndMinuteByTimeout } from '~/utilities/utils';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';
import { useAppDispatch } from '~/redux/hooks';
import SettingSection from '~/components/SettingSection';
import {
  DEFAULT_CONFIG,
  DEFAULT_PVC_SIZE,
  DEFAULT_CULLER_TIMEOUT,
  MIN_PVC_SIZE,
  MAX_PVC_SIZE,
  CULLER_TIMEOUT_LIMITED,
  CULLER_TIMEOUT_UNLIMITED,
  MAX_MINUTE,
  MIN_MINUTE,
  MIN_HOUR,
  MAX_HOUR,
  DEFAULT_HOUR,
  MIN_CULLER_TIMEOUT,
} from './const';

const DEFAULT_TOLERATION_VALUE = 'NotebooksOnly';
const TOLERATION_FORMAT = /^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/;
const TOLERATION_FORMAT_ERROR =
  "Toleration key must consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character.";

const ClusterSettings: React.FC = () => {
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number | string>(DEFAULT_PVC_SIZE);
  const [userTrackingEnabled, setUserTrackingEnabled] = React.useState(false);
  const [cullerTimeoutChecked, setCullerTimeoutChecked] =
    React.useState<string>(CULLER_TIMEOUT_UNLIMITED);
  const [cullerTimeout, setCullerTimeout] = React.useState(DEFAULT_CULLER_TIMEOUT);
  const [hour, setHour] = React.useState(DEFAULT_HOUR);
  const [minute, setMinute] = React.useState(0);
  const pvcDefaultBtnRef = React.useRef<HTMLButtonElement>();
  const { dashboardConfig } = useAppContext();
  const isJupyterEnabled = useCheckJupyterEnabled();
  const [notebookTolerationSettings, setNotebookTolerationSettings] =
    React.useState<NotebookTolerationFormSettings>({
      enabled: false,
      key: isJupyterEnabled ? DEFAULT_TOLERATION_VALUE : '',
    });
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((clusterSettings: ClusterSettings) => {
        setLoaded(true);
        setLoadError(undefined);
        setClusterSettings(clusterSettings);
        setPvcSize(clusterSettings.pvcSize);
        if (clusterSettings.notebookTolerationSettings) {
          setNotebookTolerationSettings(clusterSettings.notebookTolerationSettings);
        }
        if (clusterSettings.cullerTimeout !== DEFAULT_CULLER_TIMEOUT) {
          setCullerTimeoutChecked(CULLER_TIMEOUT_LIMITED);
          setHour(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).hour);
          setMinute(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).minute);
        }
        if (clusterSettings.userTrackingEnabled) {
          setUserTrackingEnabled(clusterSettings.userTrackingEnabled);
        }
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  React.useEffect(() => {
    if (cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED) {
      setCullerTimeout(DEFAULT_CULLER_TIMEOUT);
    } else if (cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED) {
      setCullerTimeout(getTimeoutByHourAndMinute(hour, minute));
    }
  }, [hour, minute, cullerTimeoutChecked]);

  const isSettingsChanged = React.useMemo(
    () =>
      !_.isEqual(clusterSettings, {
        pvcSize,
        cullerTimeout,
        userTrackingEnabled,
        notebookTolerationSettings,
      }),
    [pvcSize, cullerTimeout, userTrackingEnabled, clusterSettings, notebookTolerationSettings],
  );

  const radioCheckedChange = (_, event) => {
    const { value } = event.currentTarget;
    setCullerTimeoutChecked(value);
  };

  const handleSaveButtonClicked = () => {
    const newClusterSettings: ClusterSettings = {
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      notebookTolerationSettings: {
        enabled: notebookTolerationSettings.enabled,
        key: notebookTolerationSettings.key,
      },
    };
    if (!_.isEqual(clusterSettings, newClusterSettings)) {
      if (
        Number(newClusterSettings?.pvcSize) !== 0 &&
        Number(newClusterSettings?.cullerTimeout) >= MIN_CULLER_TIMEOUT
      ) {
        setSaving(true);
        updateClusterSettings(newClusterSettings)
          .then((response) => {
            setSaving(false);
            if (response.success) {
              setClusterSettings(newClusterSettings);
              dispatch(
                addNotification({
                  status: 'success',
                  title: 'Cluster settings changes saved',
                  message: 'It may take up to 2 minutes for configuration changes to be applied.',
                  timestamp: new Date(),
                }),
              );
            } else {
              throw new Error(response.error);
            }
          })
          .catch((e) => {
            setSaving(false);
            dispatch(
              addNotification({
                status: 'danger',
                title: 'Error',
                message: e.message,
                timestamp: new Date(),
              }),
            );
          });
      }
    }
  };

  return (
    <ApplicationsPage
      title="Cluster Settings"
      description="Update global settings for all users."
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load cluster settings."
      emptyMessage="No cluster settings found."
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <SettingSection
            title="PVC size"
            description="Changing the PVC size changes the storage size attached to the new notebook servers for
        all users."
          >
            <Stack hasGutter>
              <StackItem>
                <InputGroup>
                  <TextInput
                    id="pvc-size-input"
                    style={{ maxWidth: '200px' }}
                    name="pvc"
                    data-id="pvc-size-input"
                    type="text"
                    aria-label="PVC Size Input"
                    value={pvcSize}
                    pattern="/^(\s*|\d+)$/"
                    onChange={async (value: string) => {
                      const modifiedValue = value.replace(/ /g, '');
                      if (modifiedValue !== '') {
                        let newValue = Number.isInteger(Number(modifiedValue))
                          ? Number(modifiedValue)
                          : pvcSize;
                        newValue =
                          newValue > MAX_PVC_SIZE
                            ? MAX_PVC_SIZE
                            : newValue < MIN_PVC_SIZE
                            ? MIN_PVC_SIZE
                            : newValue;
                        setPvcSize(newValue);
                      } else {
                        setPvcSize(modifiedValue);
                      }
                    }}
                  />
                  <InputGroupText variant={InputGroupTextVariant.plain}>GiB</InputGroupText>
                </InputGroup>
              </StackItem>
              <StackItem>
                <Button
                  data-id="restore-default-button"
                  innerRef={pvcDefaultBtnRef}
                  variant={ButtonVariant.secondary}
                  onClick={() => {
                    setPvcSize(DEFAULT_PVC_SIZE);
                  }}
                >
                  Restore Default
                </Button>
              </StackItem>
              <StackItem>
                <HelperText>
                  <HelperTextItem
                    variant={pvcSize === '' ? 'error' : 'indeterminate'}
                    hasIcon={pvcSize === ''}
                  >
                    Note: PVC size must be between 1 GiB and 16384 GiB.
                  </HelperTextItem>
                </HelperText>
              </StackItem>
            </Stack>
          </SettingSection>
        </StackItem>
        <StackItem>
          <SettingSection
            title="Stop idle notebooks"
            description="Set the time limit for idle notebooks to be stopped."
            footer={
              <HelperText>
                <HelperTextItem>
                  All idle notebooks are stopped at cluster log out. To edit the cluster log out
                  time, discuss with your OpenShift administrator to see if the OpenShift
                  Authentication Timeout value can be modified.
                </HelperTextItem>
              </HelperText>
            }
          >
            <Stack hasGutter>
              <StackItem>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Radio
                      id="culler-timeout-unlimited"
                      data-id="culler-timeout-unlimited"
                      label="Do not stop idle notebooks"
                      isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                      name={CULLER_TIMEOUT_UNLIMITED}
                      onChange={radioCheckedChange}
                      value={CULLER_TIMEOUT_UNLIMITED}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Radio
                      id="culler-timeout-limited"
                      data-id="culler-timeout-unlimited"
                      label="Stop idle notebooks after"
                      isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED}
                      name={CULLER_TIMEOUT_LIMITED}
                      onChange={radioCheckedChange}
                      value={CULLER_TIMEOUT_LIMITED}
                      body={
                        <InputGroup>
                          <TextInput
                            id="hour-input"
                            style={{ maxWidth: '60px' }}
                            name="hour"
                            data-id="hour-input"
                            type="text"
                            aria-label="Culler Timeout Hour Input"
                            value={hour}
                            isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                            onChange={(value: string) => {
                              let newValue =
                                isNaN(Number(value)) || !Number.isInteger(Number(value))
                                  ? hour
                                  : Number(value);
                              newValue =
                                newValue > MAX_HOUR
                                  ? MAX_HOUR
                                  : newValue < MIN_HOUR
                                  ? MIN_HOUR
                                  : newValue;
                              // if the hour is max, then the minute can only be set to 0
                              if (newValue === MAX_HOUR && minute !== MIN_MINUTE) {
                                setMinute(MIN_MINUTE);
                              }
                              setHour(newValue);
                            }}
                          />
                          <InputGroupText variant={InputGroupTextVariant.plain}>
                            hours
                          </InputGroupText>
                          <TextInput
                            id="minute-input"
                            style={{ maxWidth: '40px' }}
                            name="minute"
                            data-id="minute-input"
                            type="text"
                            aria-label="Culler Timeout Minute Input"
                            value={minute}
                            isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                            onChange={(value: string) => {
                              let newValue =
                                isNaN(Number(value)) || !Number.isInteger(Number(value))
                                  ? minute
                                  : Number(value);
                              newValue =
                                newValue > MAX_MINUTE
                                  ? MAX_MINUTE
                                  : newValue < MIN_MINUTE
                                  ? MIN_MINUTE
                                  : newValue;
                              // if the hour is max, then the minute can only be set to 0
                              if (hour === MAX_HOUR) {
                                newValue = MIN_MINUTE;
                              }
                              setMinute(newValue);
                            }}
                          />
                          <InputGroupText variant={InputGroupTextVariant.plain}>
                            minutes
                          </InputGroupText>
                        </InputGroup>
                      }
                    />
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <HelperText>
                  <HelperTextItem
                    variant={cullerTimeout < MIN_CULLER_TIMEOUT ? 'error' : 'indeterminate'}
                    hasIcon={cullerTimeout < MIN_CULLER_TIMEOUT}
                  >
                    Note: Notebook culler timeout must be between 10 minutes and 1000 hours.
                  </HelperTextItem>
                </HelperText>
              </StackItem>
            </Stack>
          </SettingSection>
        </StackItem>
        {!dashboardConfig.spec.dashboardConfig.disableTracking && (
          <StackItem>
            <SettingSection
              title="Usage data collection"
              footer={
                <Text component={TextVariants.small}>
                  For more information see the{' '}
                  <Text
                    component={TextVariants.a}
                    href="https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html/managing_users_and_user_resources/usage-data-collection#usage-data-collection-notice-for-openshift-data-science"
                    target="_blank"
                  >
                    documentation
                  </Text>
                  .
                </Text>
              }
            >
              <Checkbox
                label="Allow collection of usage data"
                isChecked={userTrackingEnabled}
                onChange={() => {
                  setUserTrackingEnabled(!userTrackingEnabled);
                }}
                aria-label="usageData"
                id="usage-data-checkbox"
                data-id="usage-data-checkbox"
                name="usageDataCheckbox"
              />
            </SettingSection>
          </StackItem>
        )}
        {isJupyterEnabled && (
          <StackItem>
            <SettingSection
              title="Notebook pod tolerations"
              footer={
                <HelperText>
                  {notebookTolerationSettings.error && (
                    <HelperTextItem hasIcon variant="error">
                      {notebookTolerationSettings.error}
                    </HelperTextItem>
                  )}
                  <HelperTextItem variant="indeterminate">
                    The toleration key above will be applied to all notebook pods when they are
                    created. Add a matching taint key (with any value) to the Machine Pool(s) that
                    you want to dedicate to Notebooks.
                  </HelperTextItem>
                </HelperText>
              }
            >
              <Stack hasGutter>
                <StackItem>
                  <Checkbox
                    label="Add a toleration to notebook pods to allow them to be scheduled to tainted nodes"
                    isChecked={notebookTolerationSettings.enabled}
                    onChange={(enabled) => {
                      const newNotebookTolerationSettings: NotebookTolerationFormSettings = {
                        ...notebookTolerationSettings,
                        enabled,
                      };
                      setNotebookTolerationSettings(newNotebookTolerationSettings);
                    }}
                    aria-label="tolerationsEnabled"
                    id="tolerations-enabled-checkbox"
                    data-id="tolerations-enabled-checkbox"
                    name="tolerationsEnabledCheckbox"
                    body={
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem>Toleration key for notebook pods:</FlexItem>
                        <FlexItem>
                          <TextInput
                            id="toleration-key-input"
                            isDisabled={!notebookTolerationSettings.enabled}
                            style={{ maxWidth: '200px' }}
                            name="tolerationKey"
                            data-id="toleration-key-input"
                            type="text"
                            aria-label="Toleration key"
                            value={notebookTolerationSettings.key}
                            placeholder={DEFAULT_TOLERATION_VALUE}
                            validated={
                              notebookTolerationSettings.error ? ValidatedOptions.error : undefined
                            }
                            onChange={(value: string) => {
                              const newNotebookTolerationSettings: NotebookTolerationFormSettings =
                                {
                                  ...notebookTolerationSettings,
                                  key: value,
                                  error: TOLERATION_FORMAT.test(value)
                                    ? undefined
                                    : TOLERATION_FORMAT_ERROR,
                                };
                              setNotebookTolerationSettings(newNotebookTolerationSettings);
                            }}
                          />
                        </FlexItem>
                      </Flex>
                    }
                  />
                </StackItem>
              </Stack>
            </SettingSection>
          </StackItem>
        )}
        <StackItem>
          <Button
            data-id="submit-cluster-settings"
            isDisabled={
              saving || !pvcSize || !isSettingsChanged || !!notebookTolerationSettings.error
            }
            variant="primary"
            isLoading={saving}
            onClick={handleSaveButtonClicked}
          >
            Save changes
          </Button>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default ClusterSettings;
