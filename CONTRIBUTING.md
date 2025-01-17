# Contributing

Contributing encompasses repository specific requirements.

## Requirements

You can check the requirements of ODH in the [README section](./README.md#requirements).

## Writing code

### Running locally

Development for both "frontend" and "backend" can be done while running:

``` bash
npm run dev
```

But the recommended flow for development would be have two sessions, one for the frontend:

```bash
cd frontend
npm run start:dev
```

And one for the backend

```bash
cd backend
npm run start:dev
```

#### Give your dev env access

To give your dev environment access to the ODH configuration, log in to the OpenShift cluster and set the project to the location of the ODH installation

```bash
oc login https://api.my-openshift-cluster.com:6443 -u <username> -p <password>
```

or log in using the makefile and `.env.local` settings

```.env.local
OC_URL=https://specify.in.env:6443
OC_PROJECT=my-project
OC_USER=kubeadmin
OC_PASSWORD=my-password
```

```bash
make login
```

or

```bash
npm run make:login
```

## Debugging and Testing

### Basic testing (lint and jest)

```bash
npm run test
```

You can apply lint auto-fixes with

```bash
npm run test:fix
```

### Integration checks

To confirm the build output for both backend and frontend

```bash
npm run test:integration
```

You can update with

```bash
npm run test:integration-dev
```

or

```bash
npm run test:integration-fix
```

## Build

### dotenv files

The current build leverages `dotenv`, or `.env*`, files to apply environment build configuration.

#### Applied dotenv files

dotenv files applied to the root of this project...

- `.env`, basic settings, utilized by both "frontend" and "backend"
- `.env.local`, gitignored settings, utilized by both "frontend" and "backend"
- `.env.development`, utilized by both "frontend" and "backend". Its use can be seen with the NPM script `$ npm run dev`
- `.env.development.local`, utilized by both "frontend" and "backend". Its use can be seen with the NPM script `$ npm run dev`
- `.env.production`, is primarily used by the "frontend", minimally used by the "backend". Its use can be seen with the NPM script `$ npm run start`
- `.env.production.local`, is primarily used by the "frontend", minimally used by the "backend". Its use can be seen with the NPM script `$ npm run start`
- `.env.test`, is primarily used by the "frontend", minimally used by the "backend" during testing
- `.env.test.local`, is primarily used by the "frontend", minimally used by the "backend" during testing

There are build processes in place that leverage the `.env*.local` files, these files are actively applied in our `.gitignore` in order to avoid build conflicts. **They should continue to remain ignored, and not be added to the repository.**

#### Available parameters

The dotenv files have access to default settings grouped by facet; frontend, backend, build

...

## Deploy your version

Edit the opendatahub KfDef in your project, remove the section:

```yaml
    - kustomizeConfig:
        repoRef:
          name: manifests
          path: odh-dashboard
      name: odh-dashboard
```

Remove the current deployment of the ODH Dashboard

```bash
make undeploy
```

or

```bash
npm run make:undeploy
```

### Customize your env

Customize `.env.local` file to image and source information as desired. `npm` and the `s2i` command line tool is required.

```.env.local
IMAGE_REPOSITORY=quay.io/my-org/odh-dashboard:latest
OC_URL=https://specify.in.env:6443
OC_PROJECT=specify_in_.env

# user and password login
OC_USER=specify_in_.env
OC_PASSWORD=specify_in_.env

# or token login
#OC_TOKEN=specify_in_.env
```

### Build command

Push your branch to your repo for it to be visible to the s2i build.

Then build:

```bash
make build
```

or

```bash
npm run make:build
```

### Pushing the image

```bash
make push
```

or

```bash
npm run make:push
```

### Deploying your image

Required: The OpenShift, `oc`, command line tool is required.

```bash
make deploy
```

or

```bash
npm run make:deploy
```

### Pull Request Images

All pull requests will have an associated `pr-<PULL REQUEST NUMBER>` image built and pushed to [quay.io](https://quay.io/repository/opendatahub/odh-dashboard) for use in testing and verifying code changes as part of the PR code review.  Any updates to the PR code will automatically trigger a new PR image build, replacing the previous hash that was referenced by `pr-<PULL REQUEST NUMBER>`.
