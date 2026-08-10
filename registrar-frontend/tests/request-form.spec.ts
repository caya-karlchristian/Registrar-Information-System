import { test, expect } from '@playwright/test';

test.describe('Student Request Form E2E Tests', () => {

  test.beforeEach(async ({ context, page }) => {
    // 1. Bypass Terms and Conditions modal
    await context.addInitScript(() => {
      window.localStorage.setItem('hasAgreed', 'true');
    });

    // Enable console logging for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 2. Mock /api/me to return a Student user
    await page.route('**/api/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user_id: 43,
            email: 'student@example.com',
            name: 'Student User',
            role_name: 'student',
            policies: []
          }
        }),
      });
    });

    // 3. Mock document types (return array directly)
    await page.route('**/api/document-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { document_type_id: 1, document_name: 'Transcript of Records', access_id: 1, document_requirements: 'Dummy requirements' },
          { document_type_id: 2, document_name: 'Honorable Dismissal', access_id: 3, document_requirements: 'Dummy requirements' }
        ]),
      });
    });

    // 4. Mock certifications (return array directly)
    await page.route('**/api/certifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { certificate_type_id: 10, certificate_name: 'Graduation Certification', access_id: 1 }
        ]),
      });
    });

    // 5. Mock request purposes (return array directly)
    await page.route('**/api/request-purposes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { request_purpose_id: 101, purpose_name: 'Employment' },
          { request_purpose_id: 102, purpose_name: 'Further Studies' }
        ]),
      });
    });

    // 6. Mock other metadata lookups to prevent hangs
    await page.route('**/api/programs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
    await page.route('**/api/request-statuses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/api/announcements*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], last_page: 1 }),
      });
    });
    await page.route('**/api/notifications*', async (route) => {
      const url = route.request().url();
      if (url.includes('/unread-count')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: 0 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }),
        });
      }
    });

    // 7. Mock form submission endpoint
    await page.route('**/api/document-requests', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, request_id: 502 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }
    });
  });

  test('Walk through multi-step Student Request wizard and submit successfully', async ({ page }) => {
    // Navigate to student request page
    await page.goto('/student/request');

    // --- STEP 1: TERMS & CONDITIONS ---
    await expect(page.getByText('In compliance with the Data Privacy Act (DPA) of 2012')).toBeVisible();
    
    // Attempting to click Next without agreeing to terms should display an error
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('You must read and agree to the Terms & Conditions to proceed.')).toBeVisible();
    
    // Check agreement checkbox
    await page.locator('input[name="termsAgreed"]').check();
    await page.getByRole('button', { name: 'Next' }).click();

    // --- STEP 2: STUDENT REQUEST (Document & Purpose Selection) ---
    await expect(page.getByText('Documents Requested')).toBeVisible();

    // Select 'Transcript of Records' from multi-select
    const docDropdown = page.locator('div:has(> label:has-text("Documents Requested")) > button');
    await docDropdown.click();
    await page.getByRole('button', { name: 'Transcript of Records', exact: true }).click();
    // Close dropdown
    await docDropdown.click();

    // Select 'Employment' from purpose dropdown
    await page.locator('div:has(> label:has-text("Purpose of Request")) input').click();
    await page.getByRole('button', { name: 'Employment', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // --- STEP 3: PAYMENT AND DOCUMENT DETAILS ---
    await expect(page.getByRole('heading', { name: 'Payment and Document Details' })).toBeVisible();

    // Fill in OR Number (must be exactly 7 digits)
    await page.getByPlaceholder('XXXXXXX').fill('1234567');

    // Fill in Date of Payment (today's date)
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[name="dateOfPayment"]').fill(today);

    // Click Submit
    await page.getByRole('button', { name: 'Submit' }).click();

    // --- CONFIRMATION DIALOG ---
    await expect(page.getByText('Submit Confirmation')).toBeVisible();
    await page.locator('.modal-overlay-container').getByRole('button', { name: 'Submit' }).click();

    // --- SUCCESS SCREEN ---
    await expect(page.getByText('Please be patient as we process your requested document.')).toBeVisible();
  });
});
