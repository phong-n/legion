'use strict';

const L = require('../src/index');
const control = require('legion-control');
const metrics = require('legion-metrics');

describe('A testcase built using the Legion builder object', function() {
  it('runs before and after scripts', function(done) {
    let before_side_effect = false;
    let after_side_effect = false;

    L.create()
     .withBeforeTestAction(() => { before_side_effect = true; })
     .withAfterTestAction(() => { after_side_effect = true; })
     .withTestcase(L.of()
       .chain(() => expect(before_side_effect).toBe(true))
       .chain(() => expect(after_side_effect).toBe(false)))
     .run(20).assert()
       .then(() => expect(before_side_effect).toBe(true))
       .then(() => expect(after_side_effect).toBe(true))
       .then(done)
       .catch(done.fail);
  });

  it('knows its project key', function(done) {
    L.create()
     .withProjectKey('jasmine-test-key')
     .withTestcase(L.projectKey()
       .chain(project_key => expect(project_key).toBe('jasmine-test-key')))
     .run(1).assert()
       .then(done)
       .catch(done.fail);
  });

  it('can have a custom control client', function(done) {
    const client = control.create({});
    client.putControlData('jasmine-test-key', { five: 5 });

    L.create()
      .withController(client)
      .withProjectKey('jasmine-test-key')
      .withTestcase(L.getControlData()
        .chain(data => expect(data.five).toBe(5)))
      .run(1).assert()
        .then(done)
        .catch(done.fail);
  });

  it('can load control counters from the control service', function(done) {
    const client = control.create({});
    client.putControlData('jasmine-test-key', {});

    L.create()
      .withController(client)
      .withProjectKey('jasmine-test-key')
      .withTestcase(L.getCounters('foo',5)
        .chain(data => expect(data.to).toBe(5)))
      .run(1).assert()
        .then(done)
        .catch(done.fail);
  });

  it('has a user unique id', function(done) {
    const ids = [];

    L.create()
      .withTestcase(L.getUserUniqueId().chain(uuid => {
        expect(ids.includes(uuid)).toBe(false);
        ids.push(uuid);
      })).run(1).assert()
        .then(done)
        .catch(done.fail);
  });

  it('can add custom per-user services', function(done) {
    L.create()
      .withUserService(services => Object.assign(services, { foo : 'bar' }))
      .withTestcase(L.get().chain(state =>
        expect(state.foo).toBe('bar')
      )).run(1).assert()
        .then(done)
        .catch(done.fail);
  });

  it('can assign custom MetricsTargets', function(done) {
    let merges = 0;

    L.create()
      .withMetricsTarget(metrics.Target.create(metrics.merge, () => { merges++; return 'Hello, World'; }))
      .withTestcase(L.of())
      .run(1).assert()
        .then(hello_world => expect(hello_world).toBe(hello_world))
        .then(() => expect(merges).toBe(2)) // 1 call to merge the testcaseCompletion event, 1 call to flush metrics at end-of-test
        .then(done)
        .catch(done.fail);
  });

  it('supports packaged modules', function(done) {
    let before_test = false;
    let after_test = false;
    let users = 0;

    const my_module = { _legion_hooks: {
      beforeTestAction : () => {
        before_test = true;
      },

      afterTestAction : () => {
        after_test = true;
      },

      globalService : services => services.withService('my_global_service', users),

      userService : services => {
        users += 1;

        return services.withService('my_user_service', users);
      }
    }};

    L.create()
      .using(my_module)
      .withTestcase(L.get()
        .chain(services => {
          expect(services.my_global_service).toBe(0);
          expect(services.my_user_service).toBeGreaterThan(0);
          expect(services.my_user_service).toBeLessThan(3);
          expect(before_test).toBe(true);
          expect(after_test).toBe(false);
        }))
      .run(2).assert()
      .then(() => expect(after_test).toBe(true))
      .then(() => expect(users).toBe(2))
      .then(done)
      .catch(done.fail);
  });

  it('allows all module hooks to be undefined', function(done) {
    L.create()
      .using({_legion_hooks:{}})
      .withTestcase(L.of())
      .run(5).assert()
      .then(done)
      .catch(done.fail);
  });
});
