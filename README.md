# Forge Hello World

BlastRadius AI currently retains this Forge starter. Start with [the product requirements](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [tasks](docs/TASKS.md), and [decision log](docs/DECISIONS.md).

**Current status:** the panel has not been verified deployed or installed. The frontend dependencies are missing, both lockfiles disagree with their manifests, and this environment blocks npm connectivity and Forge CLI configuration writes. See [validation results and the next-milestone runbook](docs/VALIDATION.md) before using the generic quick start below. Dependency reconciliation is required before assuming reproducible installation. Deployment, installation, and external writes require explicit human approval.

This project contains a Forge app written in Javascript that uses [Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/) to display `Hello world!`in a Bitbucket Pull Request Overview Panel. 

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start
- Install top-level dependencies:
```
npm install
```

- Install dependencies inside of the `static/hello-world` directory:
```
npm install
```

- Modify your app by editing the files in `static/hello-world/src/`.

- Build your app (inside of the `static/hello-world` directory):
```
npm run build
```

- Deploy your app by running:
```
forge deploy
```

- Install your app in a Bitbucket workspace by running:
```
forge install
```

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new workspace.
- Once the app is installed on a workspace, the workspace picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.
