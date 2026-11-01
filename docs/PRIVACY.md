# BlastRadius AI privacy policy

Effective: November 1, 2026

This policy describes how the BlastRadius AI app for Bitbucket, provided by Marvlock, handles data in its current version.

## What the app reads

When you open a pull request in Bitbucket, the BlastRadius panel asks Bitbucket for that pull request, using your own account and permissions. It needs you to allow access the first time you use it. It uses two read-only permissions: `read:pullrequest:bitbucket` for pull request details, and `read:repository:bitbucket`, which Bitbucket requires for the list of changed files and for reading the repository's `blastradius.json` service map and the schema files that map names. The second permission allows reading repository contents you can already see, but this version only uses it for those things.

The panel displays the pull request's title, number, state, author name, source and destination branches, and source commit. It also scans the title, branch name, and description in your browser for Jira work item keys and Confluence links, and lists any it finds. It also lists the changed files, with each file's path, change type, and lines added and removed. If the repository has a `blastradius.json` file, the panel also shows the services, owners, dependencies, and Jira or Confluence references listed in it. This version does not connect to Jira or Confluence. When a schema file named in the map changes, the panel compares that file's two versions in your browser. It does not read other changed code.

## What the app stores and shares

The app does not store this data. It runs on Atlassian's Forge platform, and the data is used only to display the panel in your browser. The app does not send it to Marvlock or to any third party, and it does not use cookies or analytics of its own.

Atlassian operates Bitbucket and Forge, and its own privacy policy applies to data on those services.

## Changes

If a future version stores data or sends it to another service, this policy will be updated before that version is released.

## Contact

Questions about this policy can be sent through [marvlock.com](https://www.marvlock.com/).
