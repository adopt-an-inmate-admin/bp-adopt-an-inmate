# Adopt an Inmate

This project is being built by a team at [Blueprint](https://calblueprint.org), a student organization at the University of California, Berkeley building software pro bono for nonprofits.

## Getting Started

### Prerequisites

Check your installation of `node` and `pnpm`:

```bash
node -v
pnpm -v
```

We strongly recommend using a Node version manager like [nvm](https://github.com/nvm-sh/nvm) (for Mac) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (for Windows) to install Node.js. If you don't plan on switching between different Node versions, you can alternatively get a [prebuilt installer](https://nodejs.org/en/download/prebuilt-installer) from the Node.js website for an easier approach. Make sure to get Node version 20 and up, the latest LTS version should be sufficient.

After installing Node, you most likely have npm installed as well (check by running `npm -v`). If you have npm installed, simply run `npm install -g pnpm` to install pnpm. If your command line does not recognize npm as a command, refer to [this article](https://www.geeksforgeeks.org/how-to-resolve-npm-command-not-found-error-in-node-js/) to troubleshoot.

Additional resources:
- [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Installing pnpm without npm](https://pnpm.io/installation)

### Installation

1. Clone the repo & install dependencies

   1. Clone this repo
      - using SSH (recommended)
        ```bash
        git clone git@github.com:calblueprint/adopt-an-inmate
        ```
      - using HTTPS
        ```bash
        git clone https://github.com/calblueprint/adopt-an-inmate.git
        ```
   2. Enter the cloned directory
      ```bash
      cd adopt-an-inmate
      ```
   3. Install project dependencies. This command installs all packages from [`package.json`](package.json).
      ```bash
      pnpm install
      ```

2. Set up secrets:
   1. In the project's root directory (`adopt-an-inmate`), create a new file named `.env.local`
   2. Copy the credentials from [Blueprint's internal Notion](https://www.notion.so/calblueprint/Environment-Setup-6fb1e251cdca4393b9dd47a3436abc11?pvs=4#9c2ff603f7a44348835c97e96d521d2d) (access is required) and paste them into the `.env.local` file.

**Helpful resources**

- [GitHub: Cloning a Repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository#cloning-a-repository)
- [GitHub: Generating SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

### Development environment

- **[VSCode](https://code.visualstudio.com/) (recommended)**
  1. Open the `adopt-an-inmate` project in VSCode.
  2. Install recommended workspace VSCode extensions. You should see a pop-up on the bottom right to "install the recommended extensions for this repository".

### Running the app

In the project directory, run:

```shell
pnpm dev
```

Then, navigate to http://localhost:3000 to launch the web application.

## Application Workflow & Monday.com Integration

Applications submitted through this site are synchronized with Monday.com for administrative approval.

### 1. Export to Monday.com
When an adopter submits their application, it is exported to the **Monday Adopter Data** board.
- The adopter is created as a **Main Item**.
- The specific application is created as a **Subitem**.
- Initial status is set to `Pending`.

### 2. Approval via Monday.com Webhooks
The approval process is driven by status changes on the application **Subitem** in Monday.com.

A webhook is configured in Monday.com to send a `POST` request to `/api/monday-webhook` whenever the `subitemStatus` changes. The system handles the following status codes:

- **Status Code 8 (`PENDING_CONFIRMATION`)**: This signifies the application has been reviewed and a match is ready.
  - **Candidate Selection**: The system automatically identifies the matched adoptee using the following logic:
    1. It checks the 4 candidates chosen by the adopter in their ranked order.
    2. If any candidate has already been moved to the **Adopted** board, that candidate is selected as the match.
    3. If none of the candidates are in the **Adopted** board, it defaults to the **Rank 1** candidate.
  - **Automated Actions**:
    - The matched adoptee is moved to the **Adopted** board (if not already there) and their status is set to `A: Adopted (Local)`.
    - All other candidates are moved to the **WL PIPs** board and marked as `Wait Listed`.
    - The application status in Supabase is updated to `PENDING_CONFIRMATION`.
    - The adopter is given 2 weeks to confirm the match.
- **Status Code 4 (`REJECTED`)**: The application is marked as `REJECTED` in Supabase.
- **Status Code 1 (`REAPPLY`)**: The application status is set to `REAPPLY`, allowing the adopter to submit a new one.

### 3. Administrative Candidate Selection
If the Rank 1 candidate is no longer available (e.g., they were released), the admin can manually select a different candidate (Rank 2, 3, or 4) to be the match.

**Steps to manually select a candidate:**
1. Locate the desired candidate in Monday.com (usually in the **WL PIPs** board).
2. Move that candidate's item to the **Adopted** board.
3. (Optional) Move the unavailable candidate to an appropriate board (e.g., a "Released" board) to ensure they are not accidentally selected.
4. Go to the **Adopter Data** board and change the application subitem status to **Pending Confirmation**.

The system will detect that the manually moved candidate is in the **Adopted** board and prioritize them over the Rank 1 default.

### 4. Admin Tools
Administrative functions are available at `/admin` (restricted to the global admin user `admin@adoptaninmate.org`).

**Setup Admin User:**
If the admin user does not exist in your Supabase instance, you can create it by running:
```bash
pnpm setup-admin
```
This script uses the `SUPABASE_SERVICE_KEY` from your `.env.local` to create the `admin@adoptaninmate.org` user with the default password `St@y0ut!`.

- **Pending Applications**: View a list of applications currently awaiting review.
- **Reset Test Records**: Completely remove a test user's data to allow for re-testing the onboarding flow.
  - **Effect on Supabase**: Deletes the user's profile, all applications, and the Supabase Auth account.
  - **Effect on Monday.com**: Deletes the adopter's **Main Item** and all associated **Subitems** from the Monday boards using the stored `monday_id`s. This ensures Monday.com remains in sync with the test environment.

## System Email Notifications & Automated Triggers

The system sends transactional and lifecycle emails to applicants (adopters) as well as administrative notifications to the Adopt an Inmate team and match watchers.

### Email Configuration & Infrastructure

Emails are sent via **Brevo SMTP** (`smtp-relay.brevo.com:587`) using `nodemailer`.

Key environment variables in `.env.local`:
- `BREVO_SMTP_USER`: Brevo SMTP login username / account email.
- `BREVO_SMTP_KEY`: Brevo SMTP API key / password.
- `EMAIL_SENDER_NAME`: Sender display name (defaults to `"Adopt an Inmate Team"`).
- `EMAIL_SENDER_ADDRESS`: Sender address (defaults to `"adopt@adoptaninmate.org"`).
- `NEXT_PUBLIC_SITE_URL`: Base application URL for links generated in email bodies.

Key internal contact emails (`config.ts`):
- `CONFIG.adminEmail`: `adopt@adoptaninmate.org` (receives escalation, match rejections, and correspondence termination alerts).
- `CONFIG.matchwatchersEmail`: `matchwatchers@adoptaninmate.org` (receives new application alerts, Monday approval notifications, and adoption confirmation details).

---

### Summary of System Emails

| Email Type | Recipient | Trigger / Source | Subject Line | Timing / Frequency |
| :--- | :--- | :--- | :--- | :--- |
| **Application Submission Confirmation** | Applicant / Adopter | User submits application (`actions/queries/query.ts`) | `Adoption Application Submitted` | Instant upon form submission |
| **Match Confirmation 7-Day Reminder** | Applicant / Adopter | Daily cron job (`/api/check_dnr`) | `Reminder: Action required on your application` | 7 days after match approval (7 days before DNR deadline) |
| **Account Verification / Confirmation** | Applicant / Adopter | Supabase Auth sign-up (`actions/auth/sign-up.ts`) | Supabase default confirmation template | Instant upon user registration |
| **Password Reset** | Applicant / Adopter | Supabase Auth password reset request | Supabase default password reset template | Instant upon password reset request |
| **New Application Export Alert** | Match Watchers (`CONFIG.matchwatchersEmail`) | Application exported to Monday (`actions/monday/mutations/exportApplication.ts`) | `New Application Submitted` | Instant after Monday.com items created |
| **Match Approved via Monday** | Match Watchers (`CONFIG.matchwatchersEmail`) | Monday subitem changed to `PENDING_CONFIRMATION` (`/api/monday-webhook`) | `Application Approved` | Triggered by Monday status update |
| **Match Accepted (Adoption Confirmed)** | Match Watchers (`CONFIG.matchwatchersEmail`) | Adopter clicks "Accept" in portal (`actions/applications/handleAdopterConfirmation.ts`) | `Match Confirmed - User Agrees to Adoption` | Instant upon applicant confirmation |
| **Match Rejected** | Admin (`CONFIG.adminEmail`) | Adopter clicks "Reject" in portal (`actions/applications/handleAdopterConfirmation.ts`) | `An adopter rejected a match` | Instant upon applicant rejection |
| **Correspondence Ended** | Admin (`CONFIG.adminEmail`) | Adopter ends correspondence (`actions/applications/handleEndCorrespondence.ts`) | `An adopter ended their correspondence` | Instant upon ending correspondence |

---

### Detailed Email Workflows

#### 1. Emails Sent to Applicants

##### A. Application Submission Confirmation
- **Trigger**: When an applicant finishes selecting and ranking their 4 prospective adoptees and submits their application.
- **Code Reference**: `submitApplication` in `actions/queries/query.ts`
- **Recipient**: Applicant email address
- **Subject**: `Adoption Application Submitted`
- **Body Template**:
  ```text
  Hi! Thank you for submitting your adoption application (ID: <app_uuid>). We'll review it and get back to you with a match soon.

  Best,
  The Adopt an Inmate Team
  ```

##### B. Action Required Reminder (7-Day Warning Before Expiration)
- **Trigger**: When an administrator sets the application status on Monday.com to **Pending Confirmation** (Status Code 8), the applicant is granted a 14-day window to review and confirm their match. A daily cron job (`GET /api/check_dnr`) evaluates all pending applications. If 7 days have elapsed without confirmation (leaving 7 days remaining before the DNR cutoff), a reminder email is automatically dispatched.
- **Code Reference**: `app/api/check_dnr/route.ts`
- **Recipient**: Applicant email address
- **Subject**: `Reminder: Action required on your application`
- **Body Template**:
  ```text
  Hi <first_name>,

  This is a reminder to please come back to the Adopt an Inmate app to approve your match. 
  You can access your application here: <NEXT_PUBLIC_SITE_URL>/app

  If you don't respond within the next 7 days, your application will be automatically closed.

  Best,
  Adopt an Inmate Team
  ```
- **Note**: A database flag `reminder_sent_at` ensures this reminder is only dispatched once. If the user still does not respond after the full 14 days, the application transitions to `ENDED` with reason `DNR` (Did Not Respond), the Monday item is marked `Closed Out`, and the adoptee is returned to the waitlist pool.

##### C. Authentication & Password Reset Emails
- **Trigger**: Standard user account actions powered by Supabase Auth (e.g. account registration confirmation and forgot password links).
- **Code Reference**: `actions/auth/sign-up.ts`, `components/auth/forgot-password/`

---

#### 2. Administrative & Match Watcher Emails (Triggered by Monday.com & User Actions)

##### A. Monday.com Webhook Approval Notification
- **Trigger**: An admin changes the Subitem status on Monday.com to **Status Code 8 (`PENDING_CONFIRMATION`)**.
- **Code Reference**: `app/api/monday-webhook/route.ts`
- **Recipient**: `matchwatchers@adoptaninmate.org`
- **Subject**: `Application Approved`
- **Body Content**: `<adopterEmail>, "Confirmed their match, <adopteeName>"`
- **System Actions**:
  - Automatically selects the matched adoptee (from Adopted board if pre-moved, or defaults to Rank 1).
  - Moves matched adoptee to **Adopted** board with status `ADOPTED`.
  - Moves unmatched candidate adoptees to **WL PIPs** board with status `WAIT_LISTED`.
  - Sets application status to `PENDING_CONFIRMATION` with 14-day confirmation deadline.

##### B. New Application Submitted (Monday Export)
- **Trigger**: When an application is successfully written as a Main Item and Subitem on Monday.com.
- **Code Reference**: `actions/monday/mutations/exportApplication.ts`
- **Recipient**: `matchwatchers@adoptaninmate.org`
- **Subject**: `New Application Submitted`
- **Body Template**:
  ```text
  A new application has been submitted.
  Adopter Email: <adopter_email>

  Match List:
  1. <First Last> (<Inmate ID>)
  2. <First Last> (<Inmate ID>)
  3. <First Last> (<Inmate ID>)
  4. <First Last> (<Inmate ID>)
  ```

##### C. Adopter Confirms Match
- **Trigger**: Adopter logs into `/app` during the 14-day confirmation window and confirms adoption.
- **Code Reference**: `actions/applications/handleAdopterConfirmation.ts`
- **Recipient**: `matchwatchers@adoptaninmate.org`
- **Subject**: `Match Confirmed - User Agrees to Adoption`
- **Body Template**:
  ```text
  Adopter <adopter_email> has agreed to the adoption.

  Adopter Name: <adopter_first_name> <adopter_last_name>
  Matched Adoptee: <adoptee_first_name> <adoptee_last_name> (<inmate_id>)

  Unit Details:
  Facility: <facility_name>
  System: <system>

  Mailing Information:
  <mailing_address>
  ```
- **System Actions**: Updates application status to `ACTIVE`, marks adoptee as `formerly_adopted = true` in Supabase and Monday.com.

##### D. Adopter Rejects Match
- **Trigger**: Adopter logs into `/app` and declines the proposed match with a provided reason.
- **Code Reference**: `actions/applications/handleAdopterConfirmation.ts`
- **Recipient**: `adopt@adoptaninmate.org`
- **Subject**: `An adopter rejected a match`
- **Body Template**:
  ```text
  Dear Adopt an Inmate team,

  An adopter rejected their match. Here are the details:
  - Adopter: <adopter_email> (ID: <adopter_id>)
  - Adoptee: <adoptee_inmate_id> (ID: <adoptee_id>)
  - Timestamp: <timestamp> (UTC+0)
  - Reason: "<reason>"

  This is an automated email sent by the Adopt an Inmate web server. Please do not reply.
  ```
- **System Actions**: Updates application status to `ENDED`, subitem on Monday to `Closed Out`, and resets adoptee status to waitlist.

##### E. Adopter Ends Correspondence
- **Trigger**: Adopter with an active adoption chooses to end correspondence from the dashboard.
- **Code Reference**: `actions/applications/handleEndCorrespondence.ts`
- **Recipient**: `adopt@adoptaninmate.org`
- **Subject**: `An adopter ended their correspondence`
- **Body Template**:
  ```text
  Dear Adopt an Inmate team,

  An adopter has ended their correspondence. Here are the details:
  - Adopter: <adopter_email> (ID: <adopter_id>)
  - Adoptee: <adoptee_inmate_id> (ID: <adoptee_id>)
  - Timestamp: <timestamp> (UTC+0)
  - Reason: <reason_label> (<reason_value>)

  This is an automated email sent by the Adopt an Inmate web server. Please do not reply.
  ```

---

## Exporting & Converting Documentation

You can convert this `README.md` into standalone, formatted documentation (HTML, PDF, or Rich Text) to share outside of the project repository.

### 1. Export to HTML
Run the built-in documentation export script:

```bash
pnpm docs:export
```
*(or `pnpm docs:html`)*

This converts `README.md` into a self-contained, beautifully styled `README.html` file in the project root.

You can also specify custom input/output paths:
```bash
node scripts/export-docs.mjs <input-markdown-file> <output-html-file>
```

### 2. Export to PDF or Rich Text
Once `README.html` is generated:
- **PDF**: Open `README.html` in any web browser (Chrome, Safari, Edge, Firefox) and click the **Print / Save as PDF** button in the top right (or press `Ctrl+P` / `Cmd+P` > select **Save as PDF**).
- **Rich Text / Word / Google Docs**: Open `README.html` in a browser, select all content (`Ctrl+A` / `Cmd+A`), copy (`Ctrl+C` / `Cmd+C`), and paste directly into Google Docs, Microsoft Word, Apple Pages, or an email composer. The formatted tables, headings, blockquotes, and code blocks will retain their rich text formatting.

---

## Database & Migrations

This project uses **Supabase** for its database and auth. Schema migrations are located in the `supabase/migrations` directory.

### 1. Manual Migrations
To deploy new migrations to your linked Supabase project manually:
```bash
pnpm db:migrate
```
*Note: You may need to login first via `pnpm supabase login`.*

### 2. Automatic Migrations (Recommended)
Vercel does **not** run database migrations during its build process. To automate this and avoid manual execution, we recommend using the **Supabase GitHub Integration**:

1. Go to your **Supabase Dashboard**.
2. Navigate to **Project Settings** > **Integrations**.
3. Link your GitHub repository.
4. Enable the **GitHub Actions** or **GitHub Integration** toggle.
5. Now, whenever you push to `main`, Supabase will automatically apply any new migrations in the `supabase/migrations` folder to your production database.

Alternatively, you can set up a custom GitHub Action using the `supabase/setup-cli` action.
