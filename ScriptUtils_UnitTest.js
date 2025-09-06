
var ScriptUtils_UnitTest = Class.create();
ScriptUtils_UnitTest.prototype = /** @lends ScriptUtils_UnitTest.prototype */ {

    initialize: function() {},

    /**
     * Run unit tests
     * @param {any} instanceToTest  
     * @param {object.<string,Object.<string,Test>>} testGroups - map of testGroupNames to a map of Tests. 
     * @typedef {object} Test
     * @typedef {(bool|function)} [Test.condition] - function to decide whether to do this test. - default true if ommitted.
     * @typedef {function} Test.compute - function to carry out the test
     * @typedef {any} Test.expect - result.
     * 
     * @example
     *   obj = new SomeScriptInclude(...);
     *   testgroups = {
     *      _unit_someMethodName: {
     *          test1: {
     *              condition: runThisTest;                       // compute at declaration
     *              condition: function() { return runThisTest; } ;// compute dynamically against instanceToTest
     * 
     *              compute: function() {
     *                  do something
     *                  return result;
     *              },
     *              expect: expectedResult
     *          },
     *          test2: {
     *              condition: ...
     *              compute: ...
     *              expect: ...
     *          },
     *          test3: ...
     *          test4: ...
     *       },
     *       _unit_anotherMethodName: {
                test1: ...
     *          test2: ...
     *       }
     *   }
     *   new ScriptUtils_UnitTest(obj,testgroups);
     * 
     * OR from within the object being tested ..
     * 
     *   new ScriptUtils_UnitTest(this,testgroups);
     */
    unittest: function(instanceToTest,testgroups) {

        const self = this;

        function runTestGroup(testGroupName) {


            function serialize(obj) {
                // We'll just use JSON.stringify - assumes obj has no functions, recursion etc.
                return JSON.stringify(obj,null,4);
            }
            function isSame(obj1,obj2) {
                // We'll just use JSON.stringify - assumes objs have no functions, recursion etc.
                return JSON.stringify(obj1) === JSON.stringify(obj2);
            }

            const testGroup = testgroups[testGroupName];

            if (!testGroup) {
                self._logWarn('   SKIPPED   :No testgroup {0}',testGroupName);
            } else if (Object.keys(testGroup).length === 0) {
                self._logWarn('   SKIPPED   :Empty testgroup {0}',testGroupName);
            } else {

                // self._logWarn('   GROUP     : {0}',testGroupName);
                let testCount = { skipped:0 , run:0};

                for (testName in testGroup) {

                    if (self._gstrace) {
                        self._logInfo(`\n\nTEST ${testGroupName},${testName}`);
                    }

                    const test = testGroup[testName];

                    if (!('expect' in test)) {
                        throw new Error(`${testGroupName}:${testName} Mssing "expect"`);
                    }

                    if (!('compute' in test) || typeof test.compute !== 'function') {
                        throw new Error(`${testGroupName}:${testName} Mssing "compute()" function`);
                    }
                    
                    if (typeof test.condition === 'boolean' && !test.tcondtion)  {

                        self._logError('   SKIPPED   :{0} {1} - Condition not met',testGroupName,testName);
                        testCount.skipped++;

                    } else if (typeof test.condition === 'function' && !test.tcondtion.call(instanceToTest))  {

                        self._logError('   SKIPPED   :{0} {1} - Condition function not met',testGroupName,testName);
                        testCount.skipped++;

                    } else {

                        testCount.run++;

                        expect = test.expect;
                        try {
                            result = test.compute.call(instanceToTest);
                        } catch (ex) {
                            self._logError('***FAILED***:{0} {1} exception << {2} >>',
                                testGroupName,testName,JSON.stringify(ex,null,4));
                            result = undefined;
                        }
                        if (isSame(result,expect)) {
                            self._logInfo('   PASSED   :{0} {1} - << .1. >>',
                                testGroupName,testName,serialize(result));
                        } else {
                            self._logWarn('***FAILED***:{0} {1} expected <{2}> got <{3}>\n\n',
                                testGroupName,testName,serialize(expect),serialize(result));
                        }
                    }
                }
                if (testCount === 0) {
                    self._logWarn('***ALL SKIPPED ***:{0} All tests skipped\n\n', testGroupName);
                }
            }
        }
        function reportTestGroupsWithoutMethods(methods) {

            self._logWarn('Tests without target methods');

            for (let testGroupName in testgroups) {

                const methodName = getMethodName(testGroupName);

                if ( ! methods.includes(methodName)) {
                    self._logWarn(`   ORPHAN   :No method ${methodName} for testgroup ${testGroupName}`);
                }
            }
        }

        function reportMethodsWithoutTestGroups(methods) {

            self._logWarn('Methods without unit tests');

            for (let methodName of methods) {

                const testGroupName = getTestName(methodName);

                if ( ! (testGroupName in testgroups)) {
                    self._logWarn(`   NOUNIT   :No testgroup ${testGroupName} for method ${methodName}`);
                }
            }
        }

        function getMethods(instanceToTest) {
            const methods = [];
            for (let m in instanceToTest) {
                    if (typeof instanceToTest[m] === 'function') {
                        methods.push(m);
                    }
            }
            return methods;
        }

        const unitGroupPrefix = '_unit_';

        function getTestName(methodName) {
            return `${unitGroupPrefix}${methodName}`;
        }

        function getMethodName(testGroupName) {
            return testGroupName.slice(unitGroupPrefix.length);
        }

        const methods = getMethods(instanceToTest);

        self._logInfo(`Methods ${methods.sort().join('\n')}`);

        for (let methodName of methods) {

            let testGroupName = getTestName(methodName);

            if (testGroupName in testgroups) {
                runTestGroup(testGroupName);
            }
        }

        reportMethodsWithoutTestGroups(methods);

        reportTestGroupsWithoutMethods(methods);
    },

    /**
     * Log info message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logInfo: function( ...args) {
        this._log(gs.info,...args);
    },
    /**
     * Log warn message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logWarn: function( ...args) {
        this._log(gs.warn,...args);
    },
    /**
     * Log warn message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logError: function( ...args) {
        this._log(gs.error,...args);
    },
    /**
     * Log a message
     * @param {gs log function} logger 
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _log: function(gsLogFn,...args) {
        
        args[0] = `${this.type}:${args[0]}`;

        gsLogFn.call(gs,...args);

    },

    type: 'ScriptUtils_UnitTest'
};