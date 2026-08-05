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
  - The system automatically identifies the matched adoptee.
  - The application status in Supabase is updated to `PENDING_CONFIRMATION`.
  - The adoptee's status is updated to `ADOPTED`.
  - The adopter is given 2 weeks to confirm the match.
- **Status Code 4 (`REJECTED`)**: The application is marked as `REJECTED` in Supabase.
- **Status Code 1 (`REAPPLY`)**: The application status is set to `REAPPLY`, allowing the adopter to submit a new one.

### 3. Admin Tools
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
