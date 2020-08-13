# Aries Framework JavaScript

[![Build Status](https://dev.azure.com/Hyperledger/Aries/_apis/build/status/hyperledger.aries-framework-javascript?branchName=master)](https://dev.azure.com/Hyperledger/Aries/_build/latest?definitionId=73&branchName=master)

Hyperledger Aries Framework JavaScript (Built using TypeScript) provides features for building SSI Agents / DIDComm services.

# Project Description

Main goal of this implementation is to run 2 independent Edge Agents (clients), running on mobile or desktop, which are able to make a connection and send basic messages to each other via Routing Agent with these restrictions:

- Edge Agent is independent on underlying communication layer. It can communicate via either HTTP request-response, WebSockets or Push Notifications.
- Edge Agent can go offline and still receive its messages when goes back to online.
- There should be an option to connect more clients (Edge Agents) to one Routing Agent.
- Prevent correlation.

## Basic Explanation of Implementation

Agent class has method `receiveMessage` which **unpacks** incoming **inbound message** and then pass it to the `dispatch` method. This method just tries to find particular `handler` according to message `@type` attribute. Handler then process the message, calls services if needed and also creates **outbound message** to be send by sender, if it's required by protocol.

If handler returns an outbound message then method `sendMessage` **packs** the message with defined recipient and routing keys. This method also creates **forwardMessage** when routing keys are available. The way an outbound message is send depends on the implementation of MessageSender interface. Outbound message just need to contain all information which is needed for given communication (e. g. HTTP endpoint for HTTP protocol).

# Install dependencies

Aries Framework JavaScript depends on the indy-sdk which has some manual installation requirements. Before installing dependencies make sure to [install](https://github.com/hyperledger/indy-sdk/#installing-the-sdk) `libindy` and have the right tools installed for the [NodeJS wrapper](https://github.com/hyperledger/indy-sdk/tree/master/wrappers/nodejs#installing). The NodeJS wrapper link also contains some common troubleshooting steps.

> NOTE: The package is not tested in multiple versions of Node at the moment. If you're having trouble installing dependencies or running the framework know that at least **Node v12 DOES WORK** and **Node v14 DOES NOT WORk**.

> If you're having trouble running this project, please the the [troubleshooting](./TROUBLESHOOTING.md) section. It contains the most common errors that arise when first installing libindy.

You can now install dependencies using yarn:

```
yarn
```

## Usage

Currently we don't have published npm package yet, but you can use this library by packaging and adding as a file

In this project folder, run:

```
npm pack
```

In a project, where you want to use this library as dependency, run:

```
yarn add file:PATH_TO_REPOSITORY_FOLDER/aries-framework-javascript/aries-framework-javascript-1.0.0.tgz
```

# Running tests

To run all tests or tests requiring a connection to the ledger pool, you need to set environment variable `TEST_AGENT_PUBLIC_DID_SEED` to some DID which has been written to BuilderNet ledger with TAA. Then run test with this variable like this for example:

```
TEST_AGENT_PUBLIC_DID_SEED=someseedwrittentobuildernetleder yarn test
```

## Run e2e tests with in memory messaging

You don't have to start agencies for these tests. Communication is done via RxJS subscriptions.

```
yarn test -t "agents"
```

## Run e2e tests with HTTP based routing agencies

You have to start agencies first.

Open terminal and start Alice's agency:

```
./run.sh agency01
```

Open new terminal and start Bob's agency:

```
./run.sh agency02
```

Run tests:

```
yarn test -t "with agency"
```

## Run all tests

You have to start agencies first, because it runs all tests together.

```
yarn test
```

## Logs

If you don't want agency to be logging you just remove `DEBUG=aries-framework-javascript` from `yarn prod` command in `package.json`
