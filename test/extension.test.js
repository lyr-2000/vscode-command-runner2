/* global suite, test */

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// const vscode = require('vscode');
// const myExtension = require('../extension');

// Defines a Mocha test suite to group tests of similar kind together
import Command, { TerminalOptions } from '../src/Command';
suite("Extension Tests", function() {

    // Defines a Mocha unit test
    test("exec commands",function () {
        const command = new Command(context);
        const cmd = opts.command || opts.cmd || '';
        
    })
    test("Something 1", function() {
        console.log('helloworld')
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});