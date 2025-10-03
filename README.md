# Oxide OIDC Exchange Action

A GitHub Actions wrapper for sending a GitHub Actions OIDC identity token to an [oidc-exchange](https://github.com/oxidecomputer/oidc-exchange)
server. This action performs exactly two things:

1. Retrieve an OIDC identity token from GitHub Actions
2. Exchanges it for an Oxide Access token and returns the token

## Usage

### Addtional Permissions
Because this action needs to retrieve an OIDC identity token from the GitHub Actions runner, the
embedding workflow must define the following additional permissions:

```yaml
permissions:
  contents: read
  id-token: write
```

This grants the workflow the permission to retrieve an identity token. Note that by specifying
permissions you are overwriting (not appending to) the default token permissions. Therefore we
need to also include `contents: read` to ensure that the action can access the repository. If you
need any other permissions that are assigned by default ensure to add them to your `permissions`
declaration.

To then use the action in a workflow, add the following step where `<pin>` is the commit to pin to:

```yaml
- id: get-access-token
  uses: oxidecomputer/oxide-oidc-exchange@<pin>
  with:
    token-server: https://<url-to-token-server>
```

Then to use the access token in a subsequent step, you can reference the output of the action:

```yaml
- id: get-access-token
  uses: oxidecomputer/oxide-oidc-exchange@<pin>
  with:
    token-server: https://<url-to-token-server>

- name: Use Access Token
  run: |
    echo "Access Token: ${{ steps.get-access-token.outputs.access-token }}"
```
