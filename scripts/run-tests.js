#!/usr/bin/env node
const jest = require('jest');

const defaultArgs = ['--runInBand'];
const shouldForceExit =
	process.env.GETTY_JEST_FORCE_EXIT === '1' ||
	process.env.JEST_FORCE_EXIT === '1' ||
	process.env.CI === '1' ||
	process.env.CI === 'true';

if (shouldForceExit) defaultArgs.push('--forceExit');
const extraArgs = process.argv.slice(2).filter((arg) => arg !== '--');

jest.run([...defaultArgs, ...extraArgs]);
