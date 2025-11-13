import * as core from "@actions/core";

try {
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
    body: JSON.stringify({ token: idToken }),
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
} catch (error) {
  core.setFailed(error.message);
}
