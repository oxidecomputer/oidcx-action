# oidc-exchange action

A GitHub Action to interact with [oidc-exchange], requesting tokens and
configuring the build environment to use them. Its source code is released under
the MPL 2.0 license.

To use this action you need to spin up an instance of [oidc-exchange]. Oxide
employees can use this instance for repositories inside of the `oxidecomputer`
organization:

```
https://oidc-exchange.corp.oxide.computer
```

[oidc-exchange]: https://github.com/oxidecomputer/oidc-exchange

## Usage

### Prerequisite: permissions

This action needs to retrieve an OIDC identity token from the GitHub Actions
runner, which requires the `id-token: write` permission. You will need to add
this permission block to your workflow:

```yaml
permissions:
  id-token: write
```

Note that explicitly setting permissions overrides the default ones, so you will
need to add back the permissions you were using before. The most common one to
add back is `contents: read`, to be able to clone the repository being tested.

### Prerequisite: request authorization

[oidc-exchange] only issues tokens when the request is authorized according to
the configured policy. The policy depends on the instance you are using, ask
your instance administrator for it.

Oxide employees can refer to the policy of our production instance in [the
corp-services repo][corp-services].

[corp-services]: https://github.com/oxidecomputer/corp-services/blob/main/oidc-xchng/data/policy.polar

### Requesting Oxide silo tokens

To request the token for an Oxide silo and configure it in the build
environment, you can add this step:

```yaml
# Obtain the token:
- uses: oxidecomputer/oidc-exchange-action@<VERSION>
  with:
    token-server: https://OIDC_EXCHANGE.EXAMPLE
    service: oxide
    silo: https://SILO_NAME.SYS.RACK.EXAMPLE
    duration: 3600
    configure-env: true

# Example usage of the token:
- run: oxide instance list --project hello-world
```

With `configure-env: true`, the action will take care of configuring all Oxide
SDKs with the obtained credentials, by setting the `OXIDE_HOST` and
`OXIDE_TOKEN` environment variables. Every future step in the job will have the
credentials to access the Oxide silo.

If you want manual control over which steps can use the token, you can omit the
`configure-env` key and obtain the token through the `access-token ` step
output:

```yaml
# Obtain the token:
- uses: oxidecomputer/oidc-exchange-action@<VERSION>
  with:
    token-server: https://OIDC_EXCHANGE.EXAMPLE
    service: oxide
    silo: https://SILO_NAME.SYS.RACK.EXAMPLE
    duration: 3600
  id: oidc-exchange

# Example usage of the token:
- run: oxide instance list --project hello-world
  env:
    OXIDE_SILO: https://SILO_NAME.SYS.RACK.EXAMPLE
    OXIDE_TOKEN: ${{ steps.oidc-exchange.outputs.access-token }}
```

### Requesting GitHub access tokens

To request a GitHub access token for a repository, you can add this step to your
workflow:

```yaml
# Obtain the token:
- uses: oxidecomputer/oidc-exchange-action@<VERSION>
  with:
    token-server: https://OIDC_EXCHANGE.EXAMPLE
    service: github
    repositories: ORG/REPO1,ORG/REPO2,ORG/REPO3
    permissions: contents:write,pull_requests:write
    configure-env: true
    configure-git: true

# Example usage of the token:
- run: git clone https://github.com/ORG/REPO1
- run: gh pr create
```

The `repositories` key accepts a comma-separated list of repositories the token
should have access to. They must all belong to the same user or organization.
The `permissions` key accepts a comma-separated ist of permissions the token
should be granted. Each permission is in the form of `scope:level`, where the
scope is [one of the scopes supported by GitHub App installation
tokens][gh-perms] and the level is either `read` or `write`.

With `configure-env: true`, the action will take care of setting the
`GITHUB_TOKEN` environment variable with the obtained credentials. Every future
step in the job will be able to retrieve the token from it.

WIth the `configure-git: true`, the action will configure git to transparently
use the obtained token for all future git operations done through HTTPS,
overriding the token configured through `actions/checkout`.

If you want manual control over which steps can use the token, you can omit the
`configure-env` and `configure-git` keys and obtain the token through the
`access-token` step output:

```yaml
# Obtain the token:
- uses: oxidecomputer/oidc-exchange-action@<VERSION>
  with:
    token-server: https://OIDC_EXCHANGE.EXAMPLE
    service: github
    repositories: ORG/REPO1,ORG/REPO2,ORG/REPO3
    permissions: contents:write,pull_requests:write
    configure-env: true
    configure-git: true
  id: oidc-exchange

# Example usage of the token:
- run: git clone https://x-access-token:$GITHUB_TOKEN@github.com/ORG/REPO1
  env:
    GITHUB_TOKEN: ${{ steps.oidc-exchange.outputs.access-token }}
- run: gh pr create
  env:
    GITHUB_TOKEN: ${{ steps.oidc-exchange.outputs.access-token }}
```

[gh-perms]: https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps?apiVersion=2022-11-28
