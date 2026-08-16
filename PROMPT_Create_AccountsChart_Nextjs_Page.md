# Create AccountsChart Page in Next.js — Match Old Web Forms Behavior

## OBJECTIVE

Create the `AccountsChart` page in the NEW Next.js project located at:

`D:\cursore test`

**IMPORTANT:**

Do NOT create or modify this page in any other Next.js project.

The target project for this task is ONLY:

`D:\cursore test`

The page must reproduce the behavior of the existing old Web Forms `AccountsChart` form as closely as possible.

The goal is not simply to create a CRUD page.

The goal is:

> Reproduce the old Web Forms AccountsChart behavior, validation, create/update logic, hierarchy behavior, controls, and user workflow in the new Next.js application.

---

# 1. STUDY THE OLD APPLICATION FIRST

Before writing the Next.js page, study the old Web Forms application:

`D:\alphaapp\AlphaApp`

Find the actual AccountsChart page/form and study its complete behavior.

Also use the previous study documents created for the old project:

`D:\alphaapp\AlphaApp\study-docs`

Find all documentation related to:

* AccountsChart
* Account settings
* Account hierarchy
* Account creation
* Account update
* Account search
* Account selection
* Parent account
* Child account
* ACCCode
* PARENTCode
* Validation
* Buttons
* Controls
* Events
* Database operations
* Stored procedures
* SQL functions
* Views

Do not rely only on the study documents.

If something is unclear, inspect the actual old Web Forms source code in:

`D:\alphaapp\AlphaApp`

---

# 2. STUDY THE DATABASE STRUCTURE

Study the database definition file:

`D:\api\Alpghaafterupdate\table and view.sql`

Find the exact definition of:

`AccountsChart`

Also study any related:

* Stored procedures
* Functions
* Views
* Tables

used by the old AccountsChart form.

Do not guess the fields.

Use the actual SQL definition for:

* Column names
* Data types
* Lengths
* Nullable fields
* Primary key
* Identity fields
* Relationships
* Constraints
* Default values

---

# 3. VERY IMPORTANT — ACCOUNTSCHART IS SELF-REFERENCING

The `AccountsChart` table has a hierarchical relationship with itself.

The important business rule is:

```text
ACCCode
   ↑
   │
PARENTCode
```

`PARENTCode` contains an `ACCCode` belonging to another record in the SAME `AccountsChart` table.

That means:

```text
Parent Account
     |
     +---- Child Account
     |
     +---- Child Account
     |
     +---- Child Account
```

For example:

```text
ACCCode = 100
PARENTCode = NULL
```

can represent a root account.

Then:

```text
ACCCode = 110
PARENTCode = 100
```

means account `110` is a child of account `100`.

And:

```text
ACCCode = 111
PARENTCode = 110
```

means account `111` is a child of account `110`.

Therefore:

> `PARENTCode` must be treated as a reference to another `ACCCode` in the same AccountsChart table.

Do NOT treat `PARENTCode` as an unrelated text field.

---

# 4. STUDY HOW THE OLD FORM HANDLES THE HIERARCHY

This is very important.

Determine from the old Web Forms application:

* How the parent account is selected.
* How parent accounts are displayed.
* Whether the user can select only valid parent accounts.
* How root accounts are created.
* How child accounts are created.
* How `ACCCode` is generated or entered.
* Whether `PARENTCode` is automatically determined.
* Whether account levels are calculated.
* Whether account codes have a specific format.
* Whether a parent can have multiple children.
* Whether an account can have children.
* Whether an account with children can be deleted.
* What happens when changing a parent during update.
* What validation occurs when creating a child.
* What validation occurs when updating an account.

Reproduce the old behavior.

Do not invent a new hierarchy system.

---

# 5. STUDY THE OLD CREATE BEHAVIOR

Find exactly what happens when the user presses the old Web Forms:

**Add / New / Save**

button.

Document and reproduce:

1. Which fields are required.
2. Which fields are automatically populated.
3. How `ACCCode` is determined.
4. How `PARENTCode` is determined.
5. How the parent account is selected.
6. What validation occurs.
7. Which API/database operation is called.
8. What happens after successful save.
9. What happens when save fails.
10. What message/toast/error the user sees.
11. Whether the form resets.
12. Whether the new account appears immediately in the account list/tree.

The Next.js implementation must preserve this workflow.

---

# 6. STUDY THE OLD UPDATE BEHAVIOR

Find exactly what happens when an existing AccountsChart record is edited.

Reproduce:

* How the user selects the account.
* Which fields are editable.
* Which fields are read-only.
* Parent account behavior.
* ACCCode behavior.
* Validation.
* Duplicate validation.
* Child-account validation.
* Save/update behavior.
* Error handling.
* Success message.
* Refresh behavior.

Do NOT assume that update is simply:

```text
PUT /AccountsChart/{id}
```

First understand what the old application actually does.

Then connect it to the existing Alfa API.

---

# 7. USE THE EXISTING ALFA API

The Next.js page must use the AccountsChart API that was created in the backend.

Do NOT create a second backend.

Do NOT directly connect Next.js to SQL Server.

Use the existing API.

Study the existing API implementation and determine:

* Endpoint
* HTTP method
* Request DTO
* Response DTO
* Search endpoint
* Create endpoint
* Update endpoint
* Parent-account lookup endpoint if available

If an API operation required by the old page is missing, report it clearly instead of creating fake frontend behavior.

---

# 8. STUDY THE EXISTING NEXT.JS PROJECT STRUCTURE

Before creating the page, inspect ONLY:

`D:\cursore test`

Study how this Next.js project currently handles:

* Pages/routes
* Layout
* Navigation
* API calls
* Authentication
* Forms
* Inputs
* Select/ComboBox
* Dialogs
* Tables/grids
* Toasts
* Loading states
* Error handling
* Buttons
* Form validation
* Existing settings pages

Find a suitable existing page with similar behavior and use it as the UI template.

Do not introduce a new UI architecture.

---

# 9. CREATE THE ACCOUNTSCHART PAGE

Create the AccountsChart page inside:

`D:\cursore test`

Use the existing Next.js project conventions.

The page should support:

### Create

* New account
* Parent account selection
* Required fields
* Validation
* Save
* Success message
* Error handling
* Refresh

### Update

* Select existing account
* Load its data
* Edit allowed fields
* Change parent if the old application allows it
* Save update
* Validation
* Success message
* Error handling

### Search

If the old Web Forms page supports search, reproduce it.

Search should use the API rather than loading the entire account table unnecessarily.

---

# 10. ACCOUNTSCHART HIERARCHY UI

The UI must make the parent/child relationship understandable.

Study how the old Web Forms page displays the hierarchy.

If the old application displays accounts as:

```text
Assets
 ├── Current Assets
 │    ├── Cash
 │    └── Bank
 └── Fixed Assets
      └── Buildings
```

reproduce the same concept using the existing Next.js components/patterns.

Do not create a completely different hierarchy UI unless the old application does not have one.

The important relationship is:

```text
Parent.ACCCode
        ↓
Child.PARENTCode
        ↓
Child.ACCCode
```

Use the actual column names from the database.

---

# 11. PARENT ACCOUNT CONTROL

The parent account control must use actual AccountsChart data.

Do not allow the user to enter an arbitrary parent code if the old form uses account selection.

The parent selection should:

* Load valid accounts from API.
* Display the account information using the same convention as the old form.
* Store the correct `PARENTCode`.
* Prevent invalid parent values.
* Follow the old validation rules.

If the old application prevents selecting a child account as a parent, reproduce that rule.

---

# 12. PREVENT INVALID HIERARCHY

The page/API must respect the hierarchy rules discovered from the old application.

Examples of invalid behavior that must be considered:

* Account being its own parent.
* Invalid `PARENTCode`.
* Creating circular parent relationships.
* Moving an account under one of its own descendants.
* Deleting an account that has children if the old application prevents it.

Do not implement these rules based on assumptions.

Verify them from the old application and API/business logic.

---

# 13. ACCOUNT SETTINGS NAVIGATION

Add a link to the new AccountsChart page under the existing:

**Account Settings**

section/menu.

IMPORTANT:

Do not create a separate navigation system.

Find the existing Account Settings menu in:

`D:\cursore test`

and add:

**Accounts Chart**

as a child/menu item using the same navigation structure and styling.

The user must be able to open the AccountsChart page directly from Account Settings.

---

# 14. ROUTE

Use the existing Next.js routing convention.

For example, if the project uses:

```text
/app/account-settings/...
```

follow that convention.

Choose the actual route based on the existing project structure.

Do NOT invent a completely different routing system.

At the end, report the exact route created, for example:

```text
/account-settings/accounts-chart
```

Use the actual route that you create.

---

# 15. PAGE BEHAVIOR

The page should handle:

### Loading

Show the existing project loading/skeleton pattern.

### Saving

Prevent duplicate submissions while saving.

### Success

Use the existing toast/notification mechanism.

### Error

Use the existing API error handling mechanism.

### Validation

Show validation errors next to the relevant fields using the existing form components.

### Update

After successful update, refresh the displayed account information according to the old application's behavior.

---

# 16. DO NOT CREATE A NEW DESIGN

The goal is to reproduce the old Web Forms behavior in the new Next.js application.

Do not redesign the business workflow.

You may improve the visual appearance using the existing Next.js components, but:

* Do not remove old functionality.
* Do not remove validation.
* Do not change business behavior.
* Do not change the account hierarchy logic.
* Do not change create/update behavior.

---

# 17. TESTING

After implementation, test:

## Create root account

Create an account without a parent if the old application allows root accounts.

Verify:

* ACCCode
* PARENTCode
* Database record
* UI refresh

## Create child account

Select an existing parent.

Create a child.

Verify:

```text
Parent.ACCCode == Child.PARENTCode
```

## Update account

Load an existing account and update it.

Verify all old Web Forms update rules.

## Parent change

If the old application allows changing the parent:

* Change parent.
* Save.
* Verify `PARENTCode`.
* Verify hierarchy.

## Invalid parent

Try an invalid parent.

Verify the same validation behavior as the old application.

## Self-parent

Try to make an account its own parent.

Verify the business rule.

## Existing children

Test update/delete behavior for an account that has children according to the old application rules.

---

# 18. IMPORTANT — DO NOT MODIFY OTHER PROJECTS

The Next.js implementation MUST be created ONLY in:

`D:\cursore test`

Do NOT create files in:

* Other Next.js projects
* `D:\api\Alpghaafterupdate\frontend`
* Other frontend folders

unless I explicitly ask you to.

The backend API should only be changed if an API operation required by the page is genuinely missing.

---

# 19. FINAL REPORT

After completing the work, report:

### Old Web Forms study

* Old AccountsChart page found
* Main controls found
* Create behavior
* Update behavior
* Hierarchy behavior
* Validation rules

### API

* API endpoints used
* Any missing endpoint
* Any backend modification required

### Next.js

* Files created
* Files modified
* Exact page route
* Navigation location
* Account Settings link
* Components used

### Testing

* Create root account
* Create child account
* Update account
* Parent relationship
* Validation
* Error handling

---

# FINAL INSTRUCTION

Do this in this exact order:

1. Study `D:\alphaapp\AlphaApp\study-docs`.
2. Find and study the actual AccountsChart Web Forms page in `D:\alphaapp\AlphaApp`.
3. Study `AccountsChart` and related database objects in `D:\api\Alpghaafterupdate\table and view.sql`.
4. Study the existing AccountsChart API implementation in the Alfa backend.
5. Study existing pages/components/navigation in `D:\cursore test`.
6. Find the existing **Account Settings** navigation.
7. Create the AccountsChart page ONLY in `D:\cursore test`.
8. Reproduce the old create/update behavior.
9. Reproduce the self-referencing parent/child account behavior.
10. Add the AccountsChart link under Account Settings.
11. Test the page.
12. Report the exact files changed and the exact route created.

Do not start coding until you have studied the old AccountsChart behavior and the existing Next.js structure.
