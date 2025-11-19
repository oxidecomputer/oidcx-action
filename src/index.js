// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import * as core from "@actions/core";
import * as exec from "@actions/exec";

const requestBody = (service, callerIdentity) => {
  let body = {
    caller_identity: callerIdentity,
    service: service,
  };

  // Combinators to manipulate the inputs.
  const trim = (value) => value.trim();
  const commaSeparated = (map) => (value) => value.split(",").map(map);

  // Add the input to the body only if it's supported by the current service.
  const addToBody = (onlyWhenService, input, map) => {
    let value = core.getInput(input);
    if (service != onlyWhenService && value) {
      throw new Error(`input ${input} is only supported when the service is ${service}`);
    } else if (service == onlyWhenService && !value) {
      throw new Error(`input ${input} is required when the service is ${service}`);
    } else if (service == onlyWhenService) {
      body[input] = map(value);
    }
  };
  addToBody("oxide", "silo", trim);
  addToBody("oxide", "duration", parseInt);
  addToBody("github", "repositories", commaSeparated(trim));
  addToBody("github", "permissions", commaSeparated(trim));

  return body;
};

const configureGitCredentials = async (service, accessToken) => {
  if (service != "github") {
    throw new Error("`configure-git: true` is only supported for the GitHub service");
  } 

  const secret = btoa(`x-access-token:${accessToken}`); // base64-encode
  core.setSecret(secret);

  const host = "https://github.com/";
  core.info(`Configuring git to use the access token for authentication with ${host}`);

  await exec.exec("git", [
    "config",
    "--global",
    `http.${host}.extraheader`,
    `authorization: basic ${secret}`,
  ]);

  // actions/checkout with persist-credentials: true (default) configures ${{ github.token }} in the
  // local repository. When configuring git with our own token we should remove that.
  await exec.exec("git", [
    "config",
    "--local",
    "--unset-all",
    `http.${host}.extraheader`,
  ]);
};

const configureEnv = (service, accessToken) => {
  const set = (key, value) => {
    core.info(`configured ${key} environment variable`);
    core.exportVariable(key, value);
  };

  if (service == "github") {
    set("GITHUB_TOKEN", accessToken);
  } else if (service == "oxide") {
    set("OXIDE_HOST", core.getInput("silo"));
    set("OXIDE_TOKEN", accessToken);
  } else {
    throw new Error(`configure-env: true is not supported for service ${service}`);
  }
}

try {
  let service = core.getInput("service");
  if (service != "oxide" && service != "github") {
    throw new Error(`unsupported service: ${service}`);
  }

  let tokenServer = core.getInput("token-server");

  core.info("Requesting GitHub Actions identity token");
  const idToken = await core.getIDToken(tokenServer); // Set the token server as the audience.
  core.info("Retrieved GitHub Actions identity token");

  core.info("Exchanging identity token for Oxide access token");
  const response = await fetch(`${tokenServer}/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody(service, idToken)),
  });

  if (!response.ok) {
    // The server returns its responses in JSON, and if we get an error we want to extract the
    // message from the response. We might not get a JSON response though, if the reverse proxy is
    // misbehaving or the URL is wrong. In those cases we print the whole message.
    let text = await response.text();
    try {
      text = JSON.parse(text).message;
    } catch {}

    let error = `fetching the token failed with status code ${response.status}`;
    if (text) {
      error += `: ${text}`;
    }
    throw new Error(error);
  }

  const data = await response.json();
  core.info(`Received Oxide access token`);

  core.setSecret(data.access_token);
  core.setOutput("access-token", data.access_token);

  if (core.getInput("configure-git")) {
    await configureGitCredentials(service, data.access_token);
  }
  if (core.getInput("configure-env")) {
    configureEnv(service, data.access_token);
  }
} catch (error) {
  core.setFailed(error.message);
}
