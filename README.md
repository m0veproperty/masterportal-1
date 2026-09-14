# Master Portal

Build a secure, responsive website management portal for storing and maintaining information about a portfolio of websites.

1. Primary Purpose

The portal should allow an authorised user to:

Add, edit, archive, and delete websites

Store encrypted login credentials for each website

Track technical, security, performance, SEO, and maintenance information

Add new custom metrics and fields in the future

Search, sort, and filter websites

Import initial website information from CSV files

Receive visual warnings when maintenance checks become overdue

View a clear summary of the health and status of each website

The design should feel professional, secure, modern, and easy to scan. It should work properly on desktop, tablet, and mobile devices.

2. Security Requirements

This portal will contain highly sensitive login credentials, so security must be treated as a core requirement.

Implement the following:

Secure password-protected authentication

Passwords must be encrypted at rest and never stored in plain text

All portal traffic must use HTTPS

The portal login password must be securely hashed

Website credentials must only be decrypted when required

Credentials must be concealed by default

Each password field should have:

Copy button

Show or hide button

Clear indication when copied

Automatically conceal a revealed password again after a short period

Do not expose credentials in page source, URLs, browser logs, analytics, or client-side storage

Automatically log the user out after a configurable period of inactivity

Protect against brute-force login attempts

Use CSRF protection, secure cookies, input sanitisation, and rate limiting

Record an audit history for important actions, including:

Website added

Website deleted

Credential changed

Password revealed

Password copied

CSV imported

Do not include passwords or sensitive credentials in exported reports unless the user explicitly selects a secure credentials export option

Provide a secure backup and recovery process

Build the system so that additional users and role-based permissions could be added later, even if the first version only has one administrator.

3. Main Portal Structure

Create the following primary areas:

Dashboard

Show an overview of the entire website portfolio, including:

Total number of websites

Websites by importance level

Websites requiring urgent attention

Overdue monthly maintenance checks

Overdue quarterly maintenance checks

Websites with missing credentials

Websites with security issues

Websites with incomplete information

Recently updated websites

Include charts or summary cards where they improve usability.

Website Directory

Display all websites in a searchable and filterable table or card layout.

Each website listing should show:

Website name

Website URL

Importance level

Overall health status

Last reviewed date

Number of outstanding issues

Next maintenance date

Quick edit button

Open website button

Allow filtering by:

Very High

High

Medium

Low

Needs attention

Up to date

Overdue

Incomplete

Security issue

SEO issue

Allow sorting by:

Website name

Importance

Last updated

Next review date

Number of issues

Individual Website Page

Each website should have its own detailed management page containing clearly separated sections.

4. General Website Information

Capture:

Website name

Website URL

Importance:

Very High

High

Medium

Low

Hosting provider

Notes

Date added

Last reviewed date

Next review date

Website status:

Active

Development

Maintenance

Inactive

Archived

Allow a website to be archived rather than permanently deleted. Permanent deletion should require a clear confirmation step.

5. WordPress Credentials

Capture:

WordPress login URL

WordPress username

WordPress password

WordPress administrator email

Notes

Credentials must be concealed by default but capable of being securely copied.

6. Gmail Credentials

Capture:

Gmail email address

Gmail password

Associated telephone number

Recovery email address

Two-factor authentication enabled:

Yes

No

Unsure

Notes

7. cPanel Credentials

Capture:

cPanel login URL

cPanel username

cPanel password

Hosting account email

Notes

8. Social Media Credentials

Allow credentials to be stored for:

Facebook

X or Twitter

Pinterest

Instagram

For each platform, capture:

Profile or page URL

Username or email address

Password

Associated telephone number

Recovery email

Notes

The system should allow additional social media platforms to be added in the future.

9. WordPress Configuration

Capture the following:

WordPress Version

Free-text or version number field

WordPress Auto-Updates Enabled

Options:

Yes

No

Unsure

Not applicable

XML-RPC Disabled

Options:

Yes

No

Unsure

Not applicable

Use the label:

“Is XML-RPC disabled?”

PHP Version

Provide a selectable field.

The current recommended option should be:

Recommended: PHP 8.3

Also allow other PHP versions to be entered or selected, since hosting environments may use different versions.

Do not assume PHP 8.3 will remain the recommended version permanently. Make the recommended PHP version configurable by an administrator.

10. Theme and Plugin Maintenance

Capture:

“Are the active theme and plugins up to date?”

Options:

Yes, checked recently

No

Pending

Unsure

Other

If “Other” is selected, display a manual comment field.

When the user selects “Yes, checked recently”, automatically record the date of the check.

Display the elapsed time dynamically:

Checked today

Checked within the last week

Checked around two weeks ago

Checked around one month ago

Checked around one and a half months ago

Checked around two months ago

Checked more than two months ago

This field should be checked monthly.

Status colours:

Green: checked within the last 30 days

Amber: 31 to 45 days

Orange: 46 to 60 days

Red: more than 60 days or explicitly marked “No”

Grey: unsure, not checked, or no date available

Include a “Mark as checked today” button.

11. Security and Technical Checks

Capture the following questions:

Security Plugin

“Does the website have a security plugin installed?”

Options:

Yes

No

Unsure

Not applicable

Other

If “Other” is selected, allow a comment.

Comments and Pings

“Are comments and pings disabled on posts by default?”

Options:

Yes

No

Unsure

Not applicable

Other

Firewall

“Is a firewall installed and active?”

Options:

Yes

No

Unsure

Not applicable

Other

Caching Plugin

“Has a caching plugin been installed and properly configured?”

Options:

Yes

No

Pending

Unsure

Not applicable

Other

Image Compression

“Have the website images been properly compressed?”

Options:

Yes

No

Pending

Unsure

Not applicable

Other

If “Other” is selected, show a manual comment field.

GDPR Banner

“Does the website have a GDPR or cookie consent banner?”

Options:

Yes

No

Unsure

Not applicable

Other

External Link Security

“Do external links use the appropriate rel attributes, such as noopener and noreferrer?”

Options:

Yes

No

Unsure

Not applicable

Other

Use the technically correct spelling of noopener.

CAPTCHA Protection

“Are all public-facing forms protected by CAPTCHA or equivalent anti-spam protection?”

Options:

Yes

No

Some forms only

Unsure

Not applicable

Other

Obsolete Plugins

“Have obsolete and unused plugins been deleted?”

Options:

Yes, checked recently

No

Pending

Unsure

Not applicable

Other

When “Yes, checked recently” is selected, record the date.

This check should be performed quarterly.

Status colours:

Green: checked within the last 90 days

Amber: 91 to 105 days

Orange: 106 to 120 days

Red: more than 120 days or explicitly marked “No”

Grey: unsure or no check date available

Include a “Mark as checked today” button.

12. SEO Section

Capture:

SEO Plugin

“Which SEO plugin is installed?”

Options:

Rank Math

Yoast SEO

Another SEO plugin

None

Unsure

If “Another SEO plugin” is selected, display a text field.

Publish Dates in Search Results

“Are publish dates removed from search engine result pages where appropriate?”

Options:

Yes

No

Partially

Unsure

Not applicable

Other

13. Reusable Field Behaviour

For appropriate questions throughout the portal, support these standard options:

Yes

No

Pending

Unsure

Not applicable

Other

When “Other” is selected, automatically display a comment field.

Allow each status field to contain:

Selected answer

Optional comment

Date last checked

Name of the person who checked it

Reminder frequency

Next review date

Supporting link or evidence

Change history

Not every field must display all of these items by default. Less frequently used information can appear inside an expandable details area.

14. Custom Metrics and Fields

Allow the administrator to create new fields without modifying the underlying code.

A new custom field should support:

Field name

Section

Description

Field type:

Yes or no

Multiple choice

Text

Number

Date

URL

Credential

Recurring maintenance check

Available options

Required or optional

Reminder frequency

Colour rules

Display order

Whether it applies to all websites or selected websites

Custom fields should be editable, reorderable, archivable, and removable.

Deleting a custom field must require confirmation and should not immediately destroy historical data.

15. Colour Coordination

Use colour to communicate meaning consistently:

Green: complete, secure, recently checked, or positive

Amber: approaching the review deadline

Orange: overdue or requiring attention

Red: failed, missing, insecure, or significantly overdue

Blue: informational, neutral action, or pending review

Grey: unsure, not applicable, or not yet assessed

Do not rely on colour alone. Include text labels, icons, or status indicators for accessibility.

16. Overall Health Score

Calculate an overall health status for each website based on its checks.

Possible statuses:

Healthy

Mostly Healthy

Needs Attention

High Risk

Incomplete

Give greater weighting to critical security fields, such as:

Missing security plugin

Missing firewall

Outdated WordPress installation

Outdated plugins

Forms without CAPTCHA

Missing credential information

Old PHP version

Allow the scoring rules and field weightings to be adjusted later.

Do not treat “Unsure” as a positive response. It should contribute to an incomplete status.

17. CSV Import

I will provide several CSV files containing the website information.

Create an import process that:

Shows a preview before importing

Attempts to match CSV columns to portal fields

Allows columns to be manually remapped

Supports multiple CSV files

Identifies duplicate websites using the domain or website URL

Allows the user to merge, replace, skip, or create duplicate records

Does not overwrite existing information without confirmation

Produces an import summary

Reports rows that could not be imported

Preserves the original uploaded file for reference where secure and appropriate

Does not expose passwords in error messages or import logs

When a CSV value cannot be confidently matched:

Use “Unsure” for status fields

Preserve the original CSV value in an import note

Do not randomly convert an unclear value to “Yes” or “No” where doing so could hide a security issue

Blank CSV cells should remain blank or be marked “Not provided”. They should not automatically be interpreted as “No”.

Before completing an import, allow the user to review all credential fields and field mappings.

18. Search, Editing, and Bulk Actions

Provide:

Global search

Filters

Bulk status updates

Bulk importance updates

Bulk reminder scheduling

Bulk archive

Export selected non-sensitive information

Inline editing where appropriate

Save and cancel controls

Unsaved changes warning

Confirmation before destructive actions

Undo option where technically possible

19. Activity History

Each website should have an activity timeline showing:

Fields changed

Previous and new status

Maintenance checks completed

Credentials updated

Website importance changed

Notes added

Imports affecting the website

Sensitive values must not appear directly in the activity history.

For example, the history can say “WordPress password updated” without showing either the previous or new password.

20. Reminders

Support configurable reminders for:

Monthly theme and plugin checks

Quarterly obsolete plugin checks

Security reviews

SEO reviews

Credential reviews

Domain renewal

Hosting renewal

SSL certificate renewal

Custom maintenance checks

Initially, reminders can appear inside the portal.

Build the system so email reminders can be added later.

21. User Experience

The portal should include:

Responsive design

Clear section headings

Collapsible sections

Sticky save controls on long pages

Clear status badges

Tooltips explaining technical questions

Accessible form labels

Keyboard navigation

Suitable colour contrast

Loading states

Empty states

Error states

Success messages

Clear confirmation messages

Mobile-friendly credential copying

Avoid displaying every field at once in a large, overwhelming form. Use tabs, grouped cards, collapsible sections, or a side navigation system.

Suggested website page tabs:

Overview

Credentials

WordPress

Security

Performance

SEO

Social Media

Maintenance

Notes

Activity

22. Data Portability

Allow secure exports of non-sensitive website information in CSV format.

Credential exports should:

Be disabled by default

Require reauthentication

Display a clear security warning

Use a secure encrypted export format where possible

Never include credentials in a normal CSV export

Provide a complete backup and restore function for authorised administrators.

23. Initial Build Approach

For the first iteration:

Create the portal structure

Create the website database

Create all specified fields

Implement encrypted credential storage

Implement CSV import

Implement the monthly and quarterly date-based status logic

Implement filters, search, sorting, and importance levels

Implement custom fields

Implement the dashboard and individual website pages

Populate the portal using the CSV files I provide

Mark genuinely uncertain imported values as “Unsure”

Use placeholders only where information has not yet been supplied

Do not invent credentials, telephone numbers, usernames, URLs, or security statuses.

Before importing the final data, request:

The CSV files

The desired administrator login details

The deployment environment

The preferred database and technology stack, unless these have already been specified 

Separate to the website, I have a section within this portal for premium domains, and I'll give you a list of what those domains are. These websites do not have any, uh, associated metrics with them, um, as they are not in use, but they are worth noting nonetheless. We also have a se-se-separate section on the spreadsheet for, um, section on the portal for spreadsheets, and I will give you a couple of spreadsheets to include on there. Over time, this part of the portal can be built out, but for the first iteration, it's fine.

Password for portal will be: London44x"



Under the SEO section, can we also have an entry for, uh, search cons-- uh, are there any search console errors of which, um, you know, the options could be something like looks, uh, looks okay. Um, or looks fine, but after, you know, three months, it would need updating again to say something like needs checking. In fact, could you have a section as well within the portal, uh, called like reminders and just have a list of all of the fields, uh, that change, uh, over what period of time? It'd be good to log that. I do believe as well that the original spreadsheet in some instances is capturing things like the, uh, URLs of the social media profile. So, uh, have that, uh, registered. Under, under SEA, um, have an, uh, have a field that says, are miscellaneous links like author tags, et cetera, no followed? For the first, uh, CSV file, which are the affiliate websites, just for the SEO section, also ask, are, are, are Amazon and social links, um, no followed? For every other, uh, tab, just have the field, are social links rel no followed? To a lesser extent in terms of visibility, have the question as well, is PPC enabled? For any that are set to yes, make it more prominent

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://siteguard-vault.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8cfcde6f-daad-4c4f-8a3d-5fda2d6596fb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
