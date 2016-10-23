'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'uiGmapgoogle-maps']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/about');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for listening to errors broadcasted by ui-router, usually originating from resolves
app.run(function ($rootScope) {
    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, thrownError) {
        console.info('The following error was thrown by ui-router while transitioning to state "' + toState.name + '". The origin of this error is probably a resolve function:');
        console.error(thrownError);
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, Pics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(Pics);
});

app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/governmentforms',
        templateUrl: 'js/docs/docs.html',
        controller: 'FormController'
    });
});

app.controller('FormController', function ($scope, $http) {
    $scope.getCert = function () {
        $http.get('/api/forms/birth-certificate', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };

    $scope.getSocialCert = function () {
        $http.get('/api/forms/social-security', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('formlist', {
        url: '/govforms',
        templateUrl: 'js/formlist/formlist.html',
        controller: 'FormCtrl'
    });
});

app.controller('FormCtrl', function ($scope, $http) {
    $scope.getCert = function () {
        $http.get('/api/forms/birth-certificate', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };

    $scope.getSocialCert = function () {
        $http.get('/api/forms/social-security', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('forms', {
        url: '/forms',
        templateUrl: 'js/forms/forms.html'
    }).state('forms.lookup', {
        url: '/lookup',
        templateUrl: '/js/forms/templates/lookup.html',
        controller: 'LookupCtl'
    });
});
(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var user = response.data.user;
            Session.create(user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.user = null;

        this.create = function (user) {
            this.user = user;
        };

        this.destroy = function () {
            this.user = null;
        };
    });
})();

app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function ($scope, $http) {

    $scope.options = [{ value: '', label: 'choose one' }, { value: true, label: 'true' }, { value: false, label: 'false' }];

    $scope.updatingInfo = function () {
        var information = {
            firstName: $scope.currentPerson.firstName,
            lastName: $scope.currentPerson.lastName,
            SSN: $scope.currentPerson.SSN,
            DOB: $scope.currentPerson.DOB,
            gender: $scope.currentPerson.gender,
            race: $scope.currentPerson.race,
            veteranStatus: $scope.currentPerson.veteranStatus,
            phone: $scope.currentPerson.phone
        };
        if ($scope.needsPost) {
            $http.post('api/clients', information).then(function (person) {
                $scope.updatedPerson = person.data;
            });
        } else {
            $http.put('api/clients', information).then(function (person) {
                $scope.updatedPerson = person.data;
            });
        }
        $scope.showForms = true;
        $('html,body').animate({ scrollTop: $(document).height() }, 1000);
    };

    $scope.checkDB = function (person) {
        $http.get('/api/clients', {
            params: {
                firstName: person.firstName,
                lastName: person.lastName,
                DOB: person.DOB
            }
        }).then(function (person) {
            if (person.data.id) {
                $scope.currentPerson = person.data;
                $scope.needsPut = true;
            } else {
                $scope.needsPost = true;
            }
            $scope.isCurrentPerson = true;
        }).then(function () {
            $('html,body').animate({ scrollTop: $(document).height() }, 1000);
        }).catch(function (error) {
            console.error("ERR", error);
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('jobsMap', {
        url: '/jobs-map',
        templateUrl: './js/googleMaps/googleMaps.html',
        controller: 'jobsMapCtrl'
    });
});

app.controller('jobsMapCtrl', function ($scope) {
    $scope.map = { center: { latitude: 38.627, longitude: -90.197 }, zoom: 12 };
});
// app.factory('SecretStash', function ($http) {

//     var getStash = function () {
//         return $http.get('/api/members/secret-stash').then(function (response) {
//             return response.data;
//         });
//     };

//     return {
//         getStash: getStash
//     };

// });


app.config(function (uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyAdN3TfE13kxOFBRcgOQiRSsSs1_TFly8s',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
});

// app.config(function ($stateProvider) {
//     $stateProvider.state('home', {
//         url: '/',
//         templateUrl: 'js/home/home.html'
//     });
// });

app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function controller($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });
});

app.factory('SecretStash', function ($http) {

    var getStash = function getStash() {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };
});

app.factory('Pics', function () {
    return ['https://fabiandembski.files.wordpress.com/2015/03/users-fabianp-documents-jobs-arch-shih-neuer-ordner-installation6.jpg?w=640&h=392&crop=1', 'http://beatthe9to5.com/wp-content/uploads/2012/08/job-Search-1.jpg', 'http://hpcvt.org/wp-content/uploads/2014/02/hands-holding-house-image.jpg'];
});

app.controller('LookupCtl', function ($scope) {
    $scope.getClientInfo = function () {};
});
app.directive('basicinfo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/basicInfo/basicinfo.html'
    };
});

app.directive('missingforms', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/missingforms/missingforms.html'
    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'About', state: 'about' }, { label: 'Form List', state: 'formlist' }, { label: 'Get Started', state: 'start' }, { label: 'Jobs Map', state: 'jobsMap' }];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9QaWNzLmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbWlzc2luZ2Zvcm1zL21pc3Npbmdmb3Jtcy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCJzaG93Rm9ybXMiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJtYXAiLCJjZW50ZXIiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsInpvb20iLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldENsaWVudEluZm8iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwibGluayIsIml0ZW1zIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxtQkFBQSxDQUFBLENBQUE7O0FBRUFGLElBQUFHLE1BQUEsQ0FBQSxVQUFBQyxrQkFBQSxFQUFBQyxpQkFBQSxFQUFBO0FBQ0E7QUFDQUEsc0JBQUFDLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQUYsdUJBQUFHLFNBQUEsQ0FBQSxRQUFBO0FBQ0E7QUFDQUgsdUJBQUFJLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQVQsZUFBQVUsUUFBQSxDQUFBQyxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBVEE7O0FBV0E7QUFDQVYsSUFBQVcsR0FBQSxDQUFBLFVBQUFDLFVBQUEsRUFBQTtBQUNBQSxlQUFBQyxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBQyxLQUFBLEVBQUFDLE9BQUEsRUFBQUMsUUFBQSxFQUFBQyxTQUFBLEVBQUFDLFVBQUEsRUFBQUMsV0FBQSxFQUFBO0FBQ0FDLGdCQUFBQyxJQUFBLGdGQUFBTixRQUFBTyxJQUFBO0FBQ0FGLGdCQUFBRyxLQUFBLENBQUFKLFdBQUE7QUFDQSxLQUhBO0FBSUEsQ0FMQTs7QUFPQTtBQUNB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SUFBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUNBNEcsMEJBQUE1RyxJQUFBLEdBQUFBLElBQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUFpSCxhQUFBLFNBQUFBLFVBQUEsR0FBQTtBQUNBTCxzQkFBQTVHLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFGQTs7QUFJQWdIOztBQUVBdEksdUJBQUFDLEdBQUEsQ0FBQTBELFlBQUFQLFlBQUEsRUFBQWtGLE9BQUE7QUFDQXRJLHVCQUFBQyxHQUFBLENBQUEwRCxZQUFBTCxhQUFBLEVBQUFpRixVQUFBO0FBQ0F2SSx1QkFBQUMsR0FBQSxDQUFBMEQsWUFBQUosY0FBQSxFQUFBZ0YsVUFBQTtBQUVBOztBQXpDQSxLQUFBO0FBNkNBLENBL0NBOztBQ0FBbkosSUFBQTRJLFNBQUEsQ0FBQSxlQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQUMsa0JBQUEsR0FEQTtBQUVBdEcscUJBQUE7QUFGQSxLQUFBO0FBSUEsQ0FMQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywndWlHbWFwZ29vZ2xlLW1hcHMnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9hYm91dCcpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgbGlzdGVuaW5nIHRvIGVycm9ycyBicm9hZGNhc3RlZCBieSB1aS1yb3V0ZXIsIHVzdWFsbHkgb3JpZ2luYXRpbmcgZnJvbSByZXNvbHZlc1xuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VFcnJvcicsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcywgdGhyb3duRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKGBUaGUgZm9sbG93aW5nIGVycm9yIHdhcyB0aHJvd24gYnkgdWktcm91dGVyIHdoaWxlIHRyYW5zaXRpb25pbmcgdG8gc3RhdGUgXCIke3RvU3RhdGUubmFtZX1cIi4gVGhlIG9yaWdpbiBvZiB0aGlzIGVycm9yIGlzIHByb2JhYmx5IGEgcmVzb2x2ZSBmdW5jdGlvbjpgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aHJvd25FcnJvcik7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIFBpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKFBpY3MpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9nb3Zlcm5tZW50Zm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Zvcm1Db250cm9sbGVyJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JtQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApe1xuICAgICRzY29wZS5nZXRDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlJywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgICAgICRzY29wZS5nZXRTb2NpYWxDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL3NvY2lhbC1zZWN1cml0eScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Zvcm1saXN0Jywge1xuICAgICAgICB1cmw6ICcvZ292Zm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcm1saXN0L2Zvcm1saXN0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUN0cmwnXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1DdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3JtcycsIHtcbiAgICAgICAgdXJsOiAnL2Zvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3Jtcy9mb3Jtcy5odG1sJyxcbiAgICB9KSAgICBcbiAgICAuc3RhdGUoJ2Zvcm1zLmxvb2t1cCcsIHtcbiAgICAgICAgdXJsOiAnL2xvb2t1cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2pzL2Zvcm1zL3RlbXBsYXRlcy9sb29rdXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb29rdXBDdGwnXG4gICAgfSlcbn0pOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0YXJ0Jywge1xuICAgICAgICB1cmw6ICcvc3RhcnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2dldFN0YXJ0ZWQvc3RhcnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTdGFydEN0cmwnXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1N0YXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApe1xuXG4gICAgJHNjb3BlLm9wdGlvbnMgPSBbXG4gICAgICAgIHt2YWx1ZTogJycsIGxhYmVsOiAnY2hvb3NlIG9uZSd9LFxuICAgICAgICB7dmFsdWU6IHRydWUsIGxhYmVsOiAndHJ1ZSd9LCBcbiAgICAgICAge3ZhbHVlOiBmYWxzZSwgbGFiZWw6ICdmYWxzZSd9XG4gICAgXTtcblxuICAgICRzY29wZS51cGRhdGluZ0luZm8gPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgaW5mb3JtYXRpb24gPSB7XG4gICAgICAgICAgICBmaXJzdE5hbWU6ICRzY29wZS5jdXJyZW50UGVyc29uLmZpcnN0TmFtZSwgXG4gICAgICAgICAgICBsYXN0TmFtZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ubGFzdE5hbWUsIFxuICAgICAgICAgICAgU1NOOiAkc2NvcGUuY3VycmVudFBlcnNvbi5TU04sXG4gICAgICAgICAgICBET0I6ICRzY29wZS5jdXJyZW50UGVyc29uLkRPQixcbiAgICAgICAgICAgIGdlbmRlcjogJHNjb3BlLmN1cnJlbnRQZXJzb24uZ2VuZGVyLFxuICAgICAgICAgICAgcmFjZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ucmFjZSxcbiAgICAgICAgICAgIHZldGVyYW5TdGF0dXM6ICRzY29wZS5jdXJyZW50UGVyc29uLnZldGVyYW5TdGF0dXMsXG4gICAgICAgICAgICBwaG9uZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ucGhvbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHNjb3BlLm5lZWRzUG9zdCkge1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnYXBpL2NsaWVudHMnLCBpbmZvcm1hdGlvbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZWRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaHR0cC5wdXQoJ2FwaS9jbGllbnRzJywgaW5mb3JtYXRpb24pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVkUGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5zaG93Rm9ybXMgPSB0cnVlOyBcbiAgICAgICAgJCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKGRvY3VtZW50KS5oZWlnaHQoKSB9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNoZWNrREIgPSBmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvY2xpZW50cycsIHtcbiAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgIGZpcnN0TmFtZTogcGVyc29uLmZpcnN0TmFtZSwgXG4gICAgICAgICAgICAgICAgbGFzdE5hbWU6IHBlcnNvbi5sYXN0TmFtZSxcbiAgICAgICAgICAgICAgICBET0I6IHBlcnNvbi5ET0JcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgIGlmIChwZXJzb24uZGF0YS5pZCl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmVlZHNQdXQgPSB0cnVlOyBcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUG9zdCA9IHRydWU7IFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmlzQ3VycmVudFBlcnNvbiA9IHRydWU7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKCdodG1sLGJvZHknKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoZG9jdW1lbnQpLmhlaWdodCgpIH0sIDEwMDApO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVSUlwiLCBlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdqb2JzTWFwJywge1xuICAgICAgICB1cmw6ICcvam9icy1tYXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy4vanMvZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnam9ic01hcEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCAnam9ic01hcEN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuICAgICRzY29wZS5tYXAgPSB7IGNlbnRlcjogeyBsYXRpdHVkZTogMzguNjI3LCBsb25naXR1ZGU6IC05MC4xOTcgfSwgem9vbTogMTIgfTtcblxufSlcbi8vIGFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4vLyAgICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbi8vICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuLy8gICAgICAgICB9KTtcbi8vICAgICB9O1xuXG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4vLyAgICAgfTtcblxuLy8gfSk7XG5cblxuYXBwLmNvbmZpZyhmdW5jdGlvbih1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlcikge1xuICAgIHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyLmNvbmZpZ3VyZSh7XG4gICAgICAgIGtleTogJ0FJemFTeUFkTjNUZkUxM2t4T0ZCUmNnT1FpUlNzU3MxX1RGbHk4cycsXG4gICAgICAgIHY6ICczLjIwJywgLy9kZWZhdWx0cyB0byBsYXRlc3QgMy5YIGFueWhvd1xuICAgICAgICBsaWJyYXJpZXM6ICd3ZWF0aGVyLGdlb21ldHJ5LHZpc3VhbGl6YXRpb24nXG4gICAgfSk7XG59KVxuIiwiLy8gYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbi8vICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbi8vICAgICAgICAgdXJsOiAnLycsXG4vLyAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4vLyAgICAgfSk7XG4vLyB9KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9mYWJpYW5kZW1ic2tpLmZpbGVzLndvcmRwcmVzcy5jb20vMjAxNS8wMy91c2Vycy1mYWJpYW5wLWRvY3VtZW50cy1qb2JzLWFyY2gtc2hpaC1uZXVlci1vcmRuZXItaW5zdGFsbGF0aW9uNi5qcGc/dz02NDAmaD0zOTImY3JvcD0xJyxcbiAgICAgICAgJ2h0dHA6Ly9iZWF0dGhlOXRvNS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTIvMDgvam9iLVNlYXJjaC0xLmpwZycsXG4gICAgICAgICdodHRwOi8vaHBjdnQub3JnL3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDE0LzAyL2hhbmRzLWhvbGRpbmctaG91c2UtaW1hZ2UuanBnJyxcbiAgICBdO1xufSk7XG4iLCJhcHAuY29udHJvbGxlcignTG9va3VwQ3RsJywgZnVuY3Rpb24oJHNjb3BlKSB7XG5cdCRzY29wZS5nZXRDbGllbnRJbmZvID0gZnVuY3Rpb24oKXtcblx0fTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2Jhc2ljaW5mbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Jhc2ljSW5mby9iYXNpY2luZm8uaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdtaXNzaW5nZm9ybXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Zvcm0gTGlzdCcsIHN0YXRlOiAnZm9ybWxpc3QnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0dldCBTdGFydGVkJywgc3RhdGU6ICdzdGFydCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSm9icyBNYXAnLCBzdGF0ZTogJ2pvYnNNYXAnfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7XG4iXX0=
