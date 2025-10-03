import * as core from "@actions/core";

try {
  core.info("Requesting GitHub Actions identity token");
  const idToken = await core.getIDToken();
  core.info("Retrieved GitHub Actions identity token");

  core.info("Exchanging identity token for Oxide access token");
  const response = await fetch(`${core.getInput("token-server")}/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: idToken }),
  });

  const data = await response.json();
  core.info(`Received Oxide access token`);

  core.setSecret(data.access_token);
  core.setOutput("access-token", data.access_token);
} catch (error) {
  core.setFailed(error.message);
}
