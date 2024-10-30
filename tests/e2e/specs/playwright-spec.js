describe('Playwright', () => {
  context('Test commands', () => {
    it(`initPlaywright should connect with cypress browser`, () => {
      cy.initPlaywright().then(isConnected => {
        expect(isConnected).to.be.true;
      });
    });
    it(`assignActiveTabName should properly assign metamask tab as currently active and verify result using isMetamaskWindowActive & isCypressWindowActive`, () => {
      cy.assignActiveTabName('metamask');
      cy.isMetamaskWindowActive().then(isActive => {
        expect(isActive).to.be.true;
      });
      cy.isCypressWindowActive().then(isActive => {
        expect(isActive).to.be.false;
      });
    });
    it(`assignWindows should properly assign cypress and metamask windows`, () => {
      cy.assignWindows().then(assigned => {
        expect(assigned).to.be.true;
      });
    });
    
    it(`switchToCypressWindow should properly switch active tab to cypress window`, () => {
      cy.visit('https://sphere.market/beam');
      cy.contains('Sign in').click();
      cy.get('button[data-testid="io.metamask-connect-button"]').click();
      cy.switchToMetamaskNotification();
    cy.switchToCypressWindow();
    cy.get('button.chakra-button.css-3c3n96').click({ force: true });
    cy.switchToMetamaskNotificationFurtherAction();
    cy.get('[data-testid="nav-collections-button"]').should('be.visible').click();
    cy.get('[data-testid="collection-card"]').first().should('be.visible').click();
    cy.get('[alt="Token Image"]').first().should('be.visible').click();
    cy.contains('Buy Now').click();
    cy.get('[class="rk-c-gTLXsm rk-c-gTLXsm-ikvfUnz-css"] span').should('contain.text', 'Insufficient Balance, select another token or add funds');
    });
  });
});
