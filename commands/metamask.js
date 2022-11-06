const log = require('debug')('synpress:metamask');
const playwright = require('./playwright');

const {
  welcomePageElements,
  firstTimeFlowPageElements,
  metametricsPageElements,
  firstTimeFlowImportPageElements,
  firstTimeFlowCreatePagePageElements,
  secureYourWalletPageElements,
  revealSeedPageElements,
  endOfFlowPageElements,
} = require('../pages/metamask/first-time-flow-page');
const { mainPageElements } = require('../pages/metamask/main-page');
const { unlockPageElements } = require('../pages/metamask/unlock-page');
const {
  notificationPageElements,
  permissionsPageElements,
  confirmPageElements,
  signaturePageElements,
  encryptionPublicKeyPageElements,
  decryptPageElements,
  dataSignaturePageElements,
} = require('../pages/metamask/notification-page');
const {
  settingsPageElements,
  advancedPageElements,
  experimentalSettingsPageElements,
  resetAccountModalElements,
  addNetworkPageElements,
} = require('../pages/metamask/settings-page');
const {
  confirmationPageElements,
} = require('../pages/metamask/confirmation-page');
const { setNetwork } = require('../helpers');

let extensionInitialUrl;
let extensionId;
let extensionHomeUrl;
let extensionSettingsUrl;
let extensionAdvancedSettingsUrl;
let extensionExperimentalSettingsUrl;
let extensionAddNetworkUrl;
let extensionNewAccountUrl;
let extensionImportAccountUrl;
let walletAddress;
let switchBackToCypressWindow;

module.exports = {
  extensionId: () => {
    return extensionId;
  },
  extensionUrls: () => {
    return {
      extensionInitialUrl,
      extensionHomeUrl,
      extensionSettingsUrl,
      extensionAdvancedSettingsUrl,
      extensionExperimentalSettingsUrl,
      extensionAddNetworkUrl,
      extensionNewAccountUrl,
      extensionImportAccountUrl,
    };
  },
  walletAddress: () => {
    return walletAddress;
  },
  goTo: async url => {
    await Promise.all([
      playwright.metamaskWindow().waitForNavigation(),
      playwright.metamaskWindow().goto(url),
    ]);
    await playwright.waitUntilStable();
  },
  goToHome: async () => {
    await module.exports.goTo(extensionHomeUrl);
  },
  goToSettings: async () => {
    await module.exports.goTo(extensionSettingsUrl);
  },
  goToAdvancedSettings: async () => {
    await module.exports.goTo(extensionAdvancedSettingsUrl);
  },
  goToExperimentalSettings: async () => {
    await module.exports.goTo(extensionExperimentalSettingsUrl);
  },
  goToAddNetwork: async () => {
    await module.exports.goTo(extensionAddNetworkUrl);
  },
  goToNewAccount: async () => {
    await module.exports.goTo(extensionNewAccountUrl);
  },
  goToImportAccount: async () => {
    await module.exports.goTo(extensionImportAccountUrl);
  },
  getExtensionDetails: async () => {
    extensionInitialUrl = await playwright.metamaskWindow().url();
    extensionId = extensionInitialUrl.match('//(.*?)/')[1];
    extensionHomeUrl = `chrome-extension://${extensionId}/home.html`;
    extensionSettingsUrl = `${extensionHomeUrl}#settings`;
    extensionAdvancedSettingsUrl = `${extensionSettingsUrl}/advanced`;
    extensionExperimentalSettingsUrl = `${extensionSettingsUrl}/experimental`;
    extensionAddNetworkUrl = `${extensionSettingsUrl}/networks/add-network`;
    extensionNewAccountUrl = `${extensionHomeUrl}#new-account`;
    extensionImportAccountUrl = `${extensionNewAccountUrl}/import`;

    return {
      extensionInitialUrl,
      extensionId,
      extensionSettingsUrl,
      extensionAdvancedSettingsUrl,
      extensionExperimentalSettingsUrl,
      extensionAddNetworkUrl,
      extensionNewAccountUrl,
      extensionImportAccountUrl,
    };
  },
  // workaround for metamask random blank page on first run
  fixBlankPage: async () => {
    await playwright.metamaskWindow().waitForTimeout(1000);
    for (let times = 0; times < 5; times++) {
      if (
        !(await playwright
          .metamaskWindow()
          .locator(welcomePageElements.app)
          .isVisible())
      ) {
        await playwright.metamaskWindow().reload();
        await playwright.metamaskWindow().waitForTimeout(2000);
      } else {
        break;
      }
    }
  },
  confirmWelcomePage: async () => {
    await module.exports.fixBlankPage();
    await playwright.waitAndClick(
      welcomePageElements.confirmButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    return true;
  },
  closePopupAndTooltips: async () => {
    // note: this is required for fast execution of e2e tests to avoid flakiness
    // otherwise popup may not be detected properly and not closed
    await playwright.metamaskWindow().waitForTimeout(1000);
    if (
      await playwright
        .metamaskWindow()
        .locator(mainPageElements.popup.container)
        .isVisible()
    ) {
      const popupBackground = playwright
        .metamaskWindow()
        .locator(mainPageElements.popup.background);
      const popupBackgroundBox = await popupBackground.boundingBox();
      await playwright
        .metamaskWindow()
        .mouse.click(popupBackgroundBox.x + 1, popupBackgroundBox.y + 1);
    }
    if (
      await playwright
        .metamaskWindow()
        .locator(mainPageElements.tippyTooltip.closeButton)
        .isVisible()
    ) {
      await playwright.waitAndClick(mainPageElements.tippyTooltip.closeButton);
    }
    if (
      await playwright
        .metamaskWindow()
        .locator(mainPageElements.actionableMessage.closeButton)
        .isVisible()
    ) {
      await playwright.waitAndClick(
        mainPageElements.actionableMessage.closeButton,
      );
    }
    return true;
  },
  closeModal: async () => {
    // note: this is required for fast execution of e2e tests to avoid flakiness
    // otherwise modal may not be detected properly and not closed
    await playwright.metamaskWindow().waitForTimeout(1000);
    if (
      await playwright
        .metamaskWindow()
        .locator(mainPageElements.connectedSites.modal)
        .isVisible()
    ) {
      await playwright.waitAndClick(
        mainPageElements.connectedSites.closeButton,
      );
    }
    return true;
  },
  unlock: async password => {
    await module.exports.fixBlankPage();
    await playwright.waitAndType(unlockPageElements.passwordInput, password);
    await playwright.waitAndClick(
      unlockPageElements.unlockButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    return true;
  },
  optOutAnalytics: async () => {
    await playwright.waitAndClick(
      metametricsPageElements.optOutAnalyticsButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    return true;
  },
  importWallet: async (secretWords, password) => {
    await module.exports.optOutAnalytics();
    await playwright.waitAndClick(
      firstTimeFlowPageElements.importWalletButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    // todo: add support for more secret words (15/18/21/24)
    for (const [index, word] of secretWords.split(' ').entries()) {
      await playwright.waitAndType(
        firstTimeFlowImportPageElements.secretWordsInput(index),
        word,
      );
    }
    await playwright.waitAndType(
      firstTimeFlowImportPageElements.passwordInput,
      password,
    );
    await playwright.waitAndType(
      firstTimeFlowImportPageElements.confirmPasswordInput,
      password,
    );
    await playwright.waitAndClick(
      firstTimeFlowImportPageElements.termsCheckbox,
    );
    await playwright.waitAndClick(
      firstTimeFlowImportPageElements.importButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await playwright.waitAndClick(
      endOfFlowPageElements.allDoneButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    return true;
  },
  createWallet: async password => {
    await module.exports.optOutAnalytics();
    await playwright.waitAndClick(
      firstTimeFlowPageElements.createWalletButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await playwright.waitAndType(
      firstTimeFlowCreatePagePageElements.newPasswordInput,
      password,
    );
    await playwright.waitAndType(
      firstTimeFlowCreatePagePageElements.confirmNewPasswordInput,
      password,
    );
    await playwright.waitAndClick(
      firstTimeFlowCreatePagePageElements.newSignupCheckbox,
    );
    await playwright.waitAndClick(
      firstTimeFlowCreatePagePageElements.createButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await playwright.waitAndClick(
      secureYourWalletPageElements.nextButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await playwright.waitAndClick(
      revealSeedPageElements.remindLaterButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    return true;
  },
  importAccount: async privateKey => {
    await switchToMetamaskIfNotActive();
    await module.exports.goToImportAccount();
    await playwright.waitAndType(
      mainPageElements.importAccount.input,
      privateKey,
    );
    await playwright.waitAndClick(
      mainPageElements.importAccount.importButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    await switchToCypressIfNotActive();
    return true;
  },
  createAccount: async accountName => {
    if (accountName) {
      accountName = accountName.toLowerCase();
    }
    await switchToMetamaskIfNotActive();
    await module.exports.goToNewAccount();
    if (accountName) {
      await playwright.waitAndType(
        mainPageElements.createAccount.input,
        accountName,
      );
    }
    await playwright.waitAndClick(mainPageElements.createAccount.createButton);
    await module.exports.closePopupAndTooltips();
    await switchToCypressIfNotActive();
    return true;
  },
  switchAccount: async accountNameOrAccountNumber => {
    if (typeof accountNameOrAccountNumber === 'string') {
      accountNameOrAccountNumber = accountNameOrAccountNumber.toLowerCase();
    }
    await switchToMetamaskIfNotActive();
    // note: closePopupAndTooltips() is required after changing createAccount() to use direct urls (popup started appearing)
    // ^ this change also introduced 500ms delay for closePopupAndTooltips() function
    await module.exports.closePopupAndTooltips();
    await playwright.waitAndClick(mainPageElements.accountMenu.button);
    if (typeof accountNameOrAccountNumber === 'number') {
      await playwright.waitAndClick(
        mainPageElements.accountMenu.accountButton(accountNameOrAccountNumber),
      );
    } else {
      await playwright.waitAndClickByText(
        mainPageElements.accountMenu.accountName,
        accountNameOrAccountNumber,
      );
    }
    await module.exports.closePopupAndTooltips();
    await switchToCypressIfNotActive();
    return true;
  },
  changeNetwork: async network => {
    await switchToMetamaskIfNotActive();
    await playwright.waitAndClick(mainPageElements.networkSwitcher.button);
    if (typeof network === 'string') {
      network = network.toLowerCase();
      if (network === 'mainnet') {
        await playwright.waitAndClick(
          mainPageElements.networkSwitcher.mainnetNetworkItem,
        );
      } else if (network === 'goerli') {
        await playwright.waitAndClick(
          mainPageElements.networkSwitcher.goerliNetworkItem,
        );
      } else if (network === 'sepolia') {
        await playwright.waitAndClick(
          mainPageElements.networkSwitcher.sepoliaNetworkItem,
        );
      } else if (network === 'localhost') {
        await playwright.waitAndClick(
          mainPageElements.networkSwitcher.localhostNetworkItem,
        );
      } else {
        await playwright.waitAndClickByText(
          mainPageElements.networkSwitcher.dropdownMenuItem,
          network,
        );
      }
      await playwright.waitForText(
        mainPageElements.networkSwitcher.networkName,
        network,
      );
    } else if (typeof network === 'object') {
      network.networkName = network.networkName.toLowerCase();
      await playwright.waitAndClickByText(
        mainPageElements.networkSwitcher.dropdownMenuItem,
        network.networkName,
      );
      await playwright.waitForText(
        mainPageElements.networkSwitcher.networkName,
        network.networkName,
      );
    }
    await module.exports.closePopupAndTooltips();
    await setNetwork(network);
    await switchToCypressIfNotActive();
    return true;
  },
  addNetwork: async network => {
    await switchToMetamaskIfNotActive();
    if (
      process.env.NETWORK_NAME &&
      process.env.RPC_URL &&
      process.env.CHAIN_ID
    ) {
      network = {
        networkName: process.env.NETWORK_NAME,
        rpcUrl: process.env.RPC_URL,
        chainId: process.env.CHAIN_ID,
        symbol: process.env.SYMBOL,
        blockExplorer: process.env.BLOCK_EXPLORER,
        isTestnet: process.env.IS_TESTNET,
      };
    }
    if (typeof network === 'string') {
      network = network.toLowerCase();
    } else if (typeof network === 'object') {
      network.networkName = network.networkName.toLowerCase();
    }
    await module.exports.goToAddNetwork();
    await playwright.waitAndType(
      addNetworkPageElements.networkNameInput,
      network.networkName,
    );
    await playwright.waitAndType(
      addNetworkPageElements.rpcUrlInput,
      network.rpcUrl,
    );
    await playwright.waitAndType(
      addNetworkPageElements.chainIdInput,
      network.chainId,
    );
    if (network.symbol) {
      await playwright.waitAndType(
        addNetworkPageElements.symbolInput,
        network.symbol,
      );
    }
    if (network.blockExplorer) {
      await playwright.waitAndType(
        addNetworkPageElements.blockExplorerInput,
        network.blockExplorer,
      );
    }
    await playwright.waitAndClick(
      addNetworkPageElements.saveButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    await setNetwork(network);
    await playwright.waitForText(
      mainPageElements.networkSwitcher.networkName,
      network.networkName,
    );
    await switchToCypressIfNotActive();
    return true;
  },
  async disconnectWalletFromDapp() {
    await switchToMetamaskIfNotActive();
    await playwright.waitAndClick(mainPageElements.optionsMenu.button);
    await playwright.waitAndClick(
      mainPageElements.optionsMenu.connectedSitesButton,
    );
    if (
      await playwright
        .metamaskWindow()
        .locator(mainPageElements.connectedSites.disconnectLabel)
        .isVisible()
    ) {
      console.log(
        '[disconnectWalletFromDapp] Wallet is connected to a dapp, disconnecting..',
      );
      await playwright.waitAndClick(
        mainPageElements.connectedSites.disconnectLabel,
      );
      await playwright.waitAndClick(
        mainPageElements.connectedSites.disconnectButton,
      );
    } else {
      console.log(
        '[disconnectWalletFromDapp] Wallet is not connected to a dapp, skipping..',
      );
    }
    await module.exports.closeModal();
    await switchToCypressIfNotActive();
    return true;
  },
  async disconnectWalletFromAllDapps() {
    await switchToMetamaskIfNotActive();
    await playwright.waitAndClick(mainPageElements.optionsMenu.button);
    await playwright.waitAndClick(
      mainPageElements.optionsMenu.connectedSitesButton,
    );
    const disconnectLabels = await playwright
      .metamaskWindow()
      .$$(mainPageElements.connectedSites.disconnectLabel);
    if (disconnectLabels.length) {
      console.log(
        '[disconnectWalletFromAllDapps] Wallet is connected to dapps, disconnecting..',
      );
      // eslint-disable-next-line no-unused-vars
      for (const disconnectLabel of disconnectLabels) {
        await playwright.waitAndClick(
          mainPageElements.connectedSites.disconnectLabel,
        );
        await playwright.waitAndClick(
          mainPageElements.connectedSites.disconnectButton,
        );
      }
    } else {
      console.log(
        '[disconnectWalletFromAllDapps] Wallet is not connected to any dapps, skipping..',
      );
    }
    await module.exports.closeModal();
    await switchToCypressIfNotActive();
    return true;
  },
  activateAdvancedGasControl: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.advancedGasControlToggleOn,
      advancedPageElements.advancedGasControlToggleOff,
      skipSetup,
    );
  },
  activateEnhancedTokenDetection: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.enhancedTokenDetectionToggleOn,
      advancedPageElements.enhancedTokenDetectionToggleOff,
      skipSetup,
    );
  },
  activateShowHexData: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.showHexDataToggleOn,
      advancedPageElements.showHexDataToggleOff,
      skipSetup,
    );
  },
  activateTestnetConversion: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.showTestnetConversionOn,
      advancedPageElements.showTestnetConversionOff,
      skipSetup,
    );
  },
  activateShowTestnetNetworks: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.showTestnetNetworksOn,
      advancedPageElements.showTestnetNetworksOff,
      skipSetup,
    );
  },
  activateCustomNonce: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.customNonceToggleOn,
      advancedPageElements.customNonceToggleOff,
      skipSetup,
    );
  },
  activateDismissBackupReminder: async skipSetup => {
    return await activateAdvancedSetting(
      advancedPageElements.dismissBackupReminderOn,
      advancedPageElements.dismissBackupReminderOff,
      skipSetup,
    );
  },
  activateEnhancedGasFeeUI: async skipSetup => {
    return await activateAdvancedSetting(
      experimentalSettingsPageElements.enhancedGasFeeUIToggleOn,
      experimentalSettingsPageElements.enhancedGasFeeUIToggleOff,
      skipSetup,
      true,
    );
  },
  activateShowCustomNetworkList: async skipSetup => {
    return await activateAdvancedSetting(
      experimentalSettingsPageElements.showCustomNetworkListToggleOn,
      experimentalSettingsPageElements.showCustomNetworkListToggleOff,
      skipSetup,
      true,
    );
  },
  resetAccount: async () => {
    await switchToMetamaskIfNotActive();
    await module.exports.goToAdvancedSettings();
    await playwright.waitAndClick(advancedPageElements.resetAccountButton);
    await playwright.waitAndClick(resetAccountModalElements.resetButton);
    await playwright.waitAndClick(
      settingsPageElements.closeButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    await switchToCypressIfNotActive();
    return true;
  },
  confirmSignatureRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    if (
      await playwright
        .metamaskNotificationWindow()
        .locator(signaturePageElements.signatureRequestScrollDownButton)
        .isVisible()
    ) {
      await playwright.waitAndClick(
        signaturePageElements.signatureRequestScrollDownButton,
        notificationPage,
      );
    }
    await playwright.waitAndClick(
      signaturePageElements.confirmSignatureRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  confirmDataSignatureRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    if (
      await playwright
        .metamaskNotificationWindow()
        .locator(signaturePageElements.signatureRequestScrollDownButton)
        .isVisible()
    ) {
      await playwright.waitAndClick(
        signaturePageElements.signatureRequestScrollDownButton,
        notificationPage,
      );
    }
    await playwright.waitAndClick(
      dataSignaturePageElements.confirmDataSignatureRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectSignatureRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      signaturePageElements.rejectSignatureRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectDataSignatureRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      dataSignaturePageElements.rejectDataSignatureRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  confirmPermissionToSpend: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      notificationPageElements.allowToSpendButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectPermissionToSpend: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      notificationPageElements.rejectToSpendButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  acceptAccess: async allAccounts => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    if (allAccounts === true) {
      await playwright.waitAndClick(
        notificationPageElements.selectAllCheckbox,
        notificationPage,
      );
    }
    await playwright.waitAndClick(
      notificationPageElements.nextButton,
      notificationPage,
      { waitForEvent: 'navi' },
    );
    await playwright.waitAndClick(
      permissionsPageElements.connectButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  confirmTransaction: async gasConfig => {
    let txData = {};
    const notificationPage = await playwright.switchToMetamaskNotification();
    if (gasConfig) {
      log(
        '[confirmTransaction] gasConfig is present, determining transaction type..',
      );
      if (
        await playwright
          .metamaskNotificationWindow()
          .locator(confirmPageElements.editGasFeeLegacyButton)
          .isVisible()
      ) {
        log('[confirmTransaction] Looks like legacy tx');
        if (typeof gasConfig === 'object') {
          log('[confirmTransaction] Editing legacy tx..');
          await playwright.waitAndClick(
            confirmPageElements.editGasFeeLegacyButton,
            notificationPage,
          );
          if (
            await playwright
              .metamaskNotificationWindow()
              .locator(confirmPageElements.editGasFeeLegacyOverrideAckButton)
              .isVisible()
          ) {
            log(
              '[confirmTransaction] Override acknowledgement modal is present, closing..',
            );
            await playwright.waitAndClick(
              confirmPageElements.editGasFeeLegacyOverrideAckButton,
              notificationPage,
            );
          }
          if (gasConfig.gasLimit) {
            log('[confirmTransaction] Changing gas limit..');
            await playwright.waitAndSetValue(
              gasConfig.gasLimit.toString(),
              confirmPageElements.gasLimitLegacyInput,
              notificationPage,
            );
          }
          if (gasConfig.gasPrice) {
            log('[confirmTransaction] Changing gas price..');
            await playwright.waitAndSetValue(
              gasConfig.gasPrice.toString(),
              confirmPageElements.gasPriceLegacyInput,
              notificationPage,
            );
          }
          await playwright.waitAndClick(
            confirmPageElements.saveCustomGasFeeButton,
            notificationPage,
          );
        } else {
          log(
            "[confirmTransaction] Legacy tx doesn't support eip-1559 fees (low, market, aggressive, site), using default values..",
          );
        }
      } else {
        log('[confirmTransaction] Looks like eip-1559 tx');
        await playwright.waitAndClick(
          confirmPageElements.editGasFeeButton,
          notificationPage,
        );
        if (typeof gasConfig === 'string') {
          if (gasConfig === 'low') {
            log('[confirmTransaction] Changing gas fee to low..');
            await playwright.waitAndClick(
              confirmPageElements.gasOptionLowButton,
              notificationPage,
            );
          } else if (gasConfig === 'market') {
            log('[confirmTransaction] Changing gas fee to market..');
            await playwright.waitAndClick(
              confirmPageElements.gasOptionMediumButton,
              notificationPage,
            );
          } else if (gasConfig === 'aggressive') {
            log('[confirmTransaction] Changing gas fee to aggressive..');
            await playwright.waitAndClick(
              confirmPageElements.gasOptionHighButton,
              notificationPage,
            );
          } else if (gasConfig === 'site') {
            log('[confirmTransaction] Changing gas fee to site suggested..');
            await playwright.waitAndClick(
              confirmPageElements.gasOptionDappSuggestedButton,
              notificationPage,
            );
          }
        } else {
          log('[confirmTransaction] Editing eip-1559 tx..');
          await playwright.waitAndClick(
            confirmPageElements.gasOptionCustomButton,
            notificationPage,
          );
          if (gasConfig.gasLimit) {
            log('[confirmTransaction] Changing gas limit..');
            await playwright.waitAndClick(
              confirmPageElements.editGasLimitButton,
              notificationPage,
            );
            await playwright.waitAndSetValue(
              gasConfig.gasLimit.toString(),
              confirmPageElements.gasLimitInput,
              notificationPage,
            );
          }
          if (gasConfig.baseFee) {
            log('[confirmTransaction] Changing base fee..');
            await playwright.waitAndSetValue(
              gasConfig.baseFee.toString(),
              confirmPageElements.baseFeeInput,
              notificationPage,
            );
          }
          if (gasConfig.priorityFee) {
            log('[confirmTransaction] Changing priority fee..');
            await playwright.waitAndSetValue(
              gasConfig.priorityFee.toString(),
              confirmPageElements.priorityFeeInput,
              notificationPage,
            );
          }
          await playwright.waitAndClick(
            confirmPageElements.saveCustomGasFeeButton,
            notificationPage,
          );
        }
      }
    }
    // todo: handle setting of custom nonce here
    log('[confirmTransaction] Getting transaction nonce..');
    const customNonce = await playwright.waitAndGetAttributeValue(
      confirmPageElements.customNonceInput,
      'placeholder',
      notificationPage,
    );
    txData.customNonce = customNonce;
    log('[confirmTransaction] Checking if tx data is present..');
    if (
      await playwright
        .metamaskNotificationWindow()
        .locator(confirmPageElements.dataButton)
        .isVisible()
    ) {
      log('[confirmTransaction] Fetching tx data..');
      await playwright.waitAndClick(
        confirmPageElements.dataButton,
        notificationPage,
      );
      log('[confirmTransaction] Getting origin value..');
      const originValue = await playwright.waitAndGetValue(
        confirmPageElements.originValue,
        notificationPage,
      );
      log('[confirmTransaction] Getting bytes value..');
      const bytesValue = await playwright.waitAndGetValue(
        confirmPageElements.bytesValue,
        notificationPage,
      );
      log('[confirmTransaction] Getting hex data value..');
      const hexDataValue = await playwright.waitAndGetValue(
        confirmPageElements.hexDataValue,
        notificationPage,
      );
      txData.origin = originValue;
      txData.bytes = bytesValue;
      txData.hexData = hexDataValue;
      await playwright.waitAndClick(
        confirmPageElements.detailsButton,
        notificationPage,
      );
    }
    log('[confirmTransaction] Confirming transaction..');
    await playwright.waitAndClick(
      confirmPageElements.confirmButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    txData.confirmed = true;
    log('[confirmTransaction] Transaction confirmed!');
    if (txData) {
      return txData;
    } else {
      return true;
    }
  },
  rejectTransaction: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      confirmPageElements.rejectButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  confirmEncryptionPublicKeyRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      encryptionPublicKeyPageElements.confirmEncryptionPublicKeyButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectEncryptionPublicKeyRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      encryptionPublicKeyPageElements.rejectEncryptionPublicKeyButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  confirmDecryptionRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      decryptPageElements.confirmDecryptionRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectDecryptionRequest: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      decryptPageElements.rejectDecryptionRequestButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  allowToAddNetwork: async ({ waitForEvent } = {}) => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    if (waitForEvent) {
      await playwright.waitAndClick(
        confirmationPageElements.footer.approveButton,
        notificationPage,
        { waitForEvent },
      );
    } else {
      await playwright.waitAndClick(
        confirmationPageElements.footer.approveButton,
        notificationPage,
      );
    }
    return true;
  },
  rejectToAddNetwork: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      confirmationPageElements.footer.cancelButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  allowToSwitchNetwork: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      confirmationPageElements.footer.approveButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  rejectToSwitchNetwork: async () => {
    const notificationPage = await playwright.switchToMetamaskNotification();
    await playwright.waitAndClick(
      confirmationPageElements.footer.cancelButton,
      notificationPage,
      { waitForEvent: 'close' },
    );
    return true;
  },
  allowToAddAndSwitchNetwork: async () => {
    await module.exports.allowToAddNetwork();
    await module.exports.allowToSwitchNetwork();
    return true;
  },
  getWalletAddress: async () => {
    await switchToMetamaskIfNotActive();
    await playwright.waitAndClick(mainPageElements.optionsMenu.button);
    await playwright.waitAndClick(
      mainPageElements.optionsMenu.accountDetailsButton,
    );
    walletAddress = await playwright.waitAndGetValue(
      mainPageElements.accountModal.walletAddressInput,
    );
    await playwright.waitAndClick(mainPageElements.accountModal.closeButton);
    await switchToCypressIfNotActive();
    return walletAddress;
  },
  initialSetup: async ({
    secretWordsOrPrivateKey,
    network,
    password,
    enableAdvancedSettings,
  }) => {
    const isCustomNetwork =
      (process.env.NETWORK_NAME &&
        process.env.RPC_URL &&
        process.env.CHAIN_ID) ||
      typeof network == 'object';

    await playwright.init();
    await playwright.assignWindows();
    await playwright.assignActiveTabName('metamask');
    await module.exports.getExtensionDetails();
    await module.exports.fixBlankPage();
    if (
      await playwright
        .metamaskWindow()
        .locator(welcomePageElements.confirmButton)
        .isVisible()
    ) {
      await module.exports.confirmWelcomePage();
      if (secretWordsOrPrivateKey.includes(' ')) {
        // secret words
        await module.exports.importWallet(secretWordsOrPrivateKey, password);
      } else {
        // private key
        await module.exports.createWallet(password);
        await module.exports.importAccount(secretWordsOrPrivateKey);
      }

      await setupSettings(enableAdvancedSettings);

      if (isCustomNetwork) {
        await module.exports.addNetwork(network);
      } else {
        await module.exports.changeNetwork(network);
      }
      walletAddress = await module.exports.getWalletAddress();
      await playwright.switchToCypressWindow();
      return true;
    } else if (
      await playwright
        .metamaskWindow()
        .locator(unlockPageElements.passwordInput)
        .isVisible()
    ) {
      await module.exports.unlock(password);
      walletAddress = await module.exports.getWalletAddress();
      await playwright.switchToCypressWindow();
      return true;
    } else {
      if (
        (await playwright
          .metamaskWindow()
          .locator(mainPageElements.walletOverview)
          .isVisible()) &&
        !process.env.RESET_METAMASK
      ) {
        await switchToMetamaskIfNotActive();
        walletAddress = await module.exports.getWalletAddress();
        await playwright.switchToCypressWindow();
        return true;
      } else {
        // todo: reset metamask state
      }
    }
  },
};

async function switchToMetamaskIfNotActive() {
  if (await playwright.isCypressWindowActive()) {
    await playwright.switchToMetamaskWindow();
    switchBackToCypressWindow = true;
  }
  return switchBackToCypressWindow;
}

async function switchToCypressIfNotActive() {
  if (switchBackToCypressWindow) {
    await playwright.switchToCypressWindow();
    switchBackToCypressWindow = false;
  }
  return switchBackToCypressWindow;
}

async function activateAdvancedSetting(
  toggleOn,
  toggleOff,
  skipSetup,
  experimental,
) {
  if (!skipSetup) {
    await switchToMetamaskIfNotActive();
    if (experimental) {
      await module.exports.goToExperimentalSettings();
    } else {
      await module.exports.goToAdvancedSettings();
    }
  }
  if (!(await playwright.metamaskWindow().locator(toggleOn).isVisible())) {
    await playwright.waitAndClick(toggleOff);
  }
  if (!skipSetup) {
    await playwright.waitAndClick(
      settingsPageElements.closeButton,
      await playwright.metamaskWindow(),
      {
        waitForEvent: 'navi',
      },
    );
    await module.exports.closePopupAndTooltips();
    await switchToCypressIfNotActive();
  }
  return true;
}

async function setupSettings(enableAdvancedSettings) {
  await switchToMetamaskIfNotActive();
  await module.exports.goToAdvancedSettings();
  await module.exports.activateAdvancedGasControl(true);
  await module.exports.activateShowHexData(true);
  await module.exports.activateShowTestnetNetworks(true);
  await module.exports.activateCustomNonce(true);
  await module.exports.activateDismissBackupReminder(true);
  if (enableAdvancedSettings) {
    await module.exports.activateEnhancedTokenDetection(true);
    await module.exports.activateTestnetConversion(true);
  }
  await module.exports.goToExperimentalSettings();
  await module.exports.activateEnhancedGasFeeUI(true);
  await playwright.waitAndClick(
    settingsPageElements.closeButton,
    await playwright.metamaskWindow(),
    {
      waitForEvent: 'navi',
    },
  );
  await module.exports.closePopupAndTooltips();
  await switchToCypressIfNotActive();
  return true;
}
