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
    $scope.showForms = false;

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
            $scope.showForms = true;
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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});

app.directive('missingforms', function ($http) {
    return {
        restrict: 'E',
        scope: false,
        templateUrl: 'js/common/directives/missingforms/missingforms.html',
        link: function link(scope) {
            console.log(scope);
            scope.getBC = function () {
                console.log('hello');
                $http.get('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
            scope.getSSC = function () {
                console.log('hello');
                $http.get('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
        }

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9QaWNzLmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJzaG93Rm9ybXMiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJtYXAiLCJjZW50ZXIiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsInpvb20iLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldENsaWVudEluZm8iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwibGluayIsImxvZyIsImdldEJDIiwiRmlyc3RfTmFtZSIsIkxhc3RfTmFtZSIsImdldFNTQyIsIml0ZW1zIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxtQkFBQSxDQUFBLENBQUE7O0FBRUFGLElBQUFHLE1BQUEsQ0FBQSxVQUFBQyxrQkFBQSxFQUFBQyxpQkFBQSxFQUFBO0FBQ0E7QUFDQUEsc0JBQUFDLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQUYsdUJBQUFHLFNBQUEsQ0FBQSxRQUFBO0FBQ0E7QUFDQUgsdUJBQUFJLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQVQsZUFBQVUsUUFBQSxDQUFBQyxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBVEE7O0FBV0E7QUFDQVYsSUFBQVcsR0FBQSxDQUFBLFVBQUFDLFVBQUEsRUFBQTtBQUNBQSxlQUFBQyxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBQyxLQUFBLEVBQUFDLE9BQUEsRUFBQUMsUUFBQSxFQUFBQyxTQUFBLEVBQUFDLFVBQUEsRUFBQUMsV0FBQSxFQUFBO0FBQ0FDLGdCQUFBQyxJQUFBLGdGQUFBTixRQUFBTyxJQUFBO0FBQ0FGLGdCQUFB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QUFBO0FBQ0E1SSx1QkFBQUMsR0FBQSxDQUFBMEQsWUFBQUosY0FBQSxFQUFBcUYsVUFBQTtBQUVBOztBQXpDQSxLQUFBO0FBNkNBLENBL0NBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCd1aUdtYXBnb29nbGUtbWFwcyddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2Fib3V0Jyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2dvdmVybm1lbnRmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUNvbnRyb2xsZXInXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1Db250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ybWxpc3QnLCB7XG4gICAgICAgIHVybDogJy9nb3Zmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ybWxpc3QvZm9ybWxpc3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGb3JtQ3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ybUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuZ2V0Q2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgICAgICAkc2NvcGUuZ2V0U29jaWFsQ2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9zb2NpYWwtc2VjdXJpdHknLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Zvcm1zJywge1xuICAgICAgICB1cmw6ICcvZm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcm1zL2Zvcm1zLmh0bWwnLFxuICAgIH0pICAgIFxuICAgIC5zdGF0ZSgnZm9ybXMubG9va3VwJywge1xuICAgICAgICB1cmw6ICcvbG9va3VwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvanMvZm9ybXMvdGVtcGxhdGVzL2xvb2t1cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvb2t1cEN0bCdcbiAgICB9KVxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc3RhcnQnLCB7XG4gICAgICAgIHVybDogJy9zdGFydCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2V0U3RhcnRlZC9zdGFydC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0YXJ0Q3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignU3RhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLnNob3dGb3JtcyA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wdGlvbnMgPSBbXG4gICAgICAgIHt2YWx1ZTogJycsIGxhYmVsOiAnY2hvb3NlIG9uZSd9LFxuICAgICAgICB7dmFsdWU6IHRydWUsIGxhYmVsOiAndHJ1ZSd9LFxuICAgICAgICB7dmFsdWU6IGZhbHNlLCBsYWJlbDogJ2ZhbHNlJ31cbiAgICBdO1xuXG4gICAgJHNjb3BlLnVwZGF0aW5nSW5mbyA9IGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgdmFyIGluZm9ybWF0aW9uID0ge1xuICAgICAgICAgICAgZmlyc3ROYW1lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5maXJzdE5hbWUsXG4gICAgICAgICAgICBsYXN0TmFtZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ubGFzdE5hbWUsXG4gICAgICAgICAgICBTU046ICRzY29wZS5jdXJyZW50UGVyc29uLlNTTixcbiAgICAgICAgICAgIERPQjogJHNjb3BlLmN1cnJlbnRQZXJzb24uRE9CLFxuICAgICAgICAgICAgZ2VuZGVyOiAkc2NvcGUuY3VycmVudFBlcnNvbi5nZW5kZXIsXG4gICAgICAgICAgICByYWNlOiAkc2NvcGUuY3VycmVudFBlcnNvbi5yYWNlLFxuICAgICAgICAgICAgdmV0ZXJhblN0YXR1czogJHNjb3BlLmN1cnJlbnRQZXJzb24udmV0ZXJhblN0YXR1cyxcbiAgICAgICAgICAgIHBob25lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5waG9uZVxuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUubmVlZHNQb3N0KSB7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KCdhcGkvY2xpZW50cycsIGluZm9ybWF0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlZFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRodHRwLnB1dCgnYXBpL2NsaWVudHMnLCBpbmZvcm1hdGlvbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZWRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAkKCdodG1sLGJvZHknKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoZG9jdW1lbnQpLmhlaWdodCgpIH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2hlY2tEQiA9IGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9jbGllbnRzJywge1xuICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgZmlyc3ROYW1lOiBwZXJzb24uZmlyc3ROYW1lLFxuICAgICAgICAgICAgICAgIGxhc3ROYW1lOiBwZXJzb24ubGFzdE5hbWUsXG4gICAgICAgICAgICAgICAgRE9COiBwZXJzb24uRE9CXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICBpZiAocGVyc29uLmRhdGEuaWQpe1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUHV0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUG9zdCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuaXNDdXJyZW50UGVyc29uID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5zaG93Rm9ybXMgPSB0cnVlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKGRvY3VtZW50KS5oZWlnaHQoKSB9LCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJcIiwgZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnam9ic01hcCcsIHtcbiAgICAgICAgdXJsOiAnL2pvYnMtbWFwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcuL2pzL2dvb2dsZU1hcHMvZ29vZ2xlTWFwcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ2pvYnNNYXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuXG5hcHAuY29udHJvbGxlciggJ2pvYnNNYXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAkc2NvcGUubWFwID0geyBjZW50ZXI6IHsgbGF0aXR1ZGU6IDM4LjYyNywgbG9uZ2l0dWRlOiAtOTAuMTk3IH0sIHpvb206IDEyIH07XG5cbn0pXG4vLyBhcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuLy8gICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4vLyAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbi8vICAgICAgICAgfSk7XG4vLyAgICAgfTtcblxuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuLy8gICAgIH07XG5cbi8vIH0pO1xuXG5cbmFwcC5jb25maWcoZnVuY3Rpb24odWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIpIHtcbiAgICB1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlci5jb25maWd1cmUoe1xuICAgICAgICBrZXk6ICdBSXphU3lBZE4zVGZFMTNreE9GQlJjZ09RaVJTc1NzMV9URmx5OHMnLFxuICAgICAgICB2OiAnMy4yMCcsIC8vZGVmYXVsdHMgdG8gbGF0ZXN0IDMuWCBhbnlob3dcbiAgICAgICAgbGlicmFyaWVzOiAnd2VhdGhlcixnZW9tZXRyeSx2aXN1YWxpemF0aW9uJ1xuICAgIH0pO1xufSlcbiIsIi8vIGFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4vLyAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4vLyAgICAgICAgIHVybDogJy8nLFxuLy8gICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuLy8gICAgIH0pO1xuLy8gfSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vZmFiaWFuZGVtYnNraS5maWxlcy53b3JkcHJlc3MuY29tLzIwMTUvMDMvdXNlcnMtZmFiaWFucC1kb2N1bWVudHMtam9icy1hcmNoLXNoaWgtbmV1ZXItb3JkbmVyLWluc3RhbGxhdGlvbjYuanBnP3c9NjQwJmg9MzkyJmNyb3A9MScsXG4gICAgICAgICdodHRwOi8vYmVhdHRoZTl0bzUuY29tL3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDEyLzA4L2pvYi1TZWFyY2gtMS5qcGcnLFxuICAgICAgICAnaHR0cDovL2hwY3Z0Lm9yZy93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wMi9oYW5kcy1ob2xkaW5nLWhvdXNlLWltYWdlLmpwZycsXG4gICAgXTtcbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0xvb2t1cEN0bCcsIGZ1bmN0aW9uKCRzY29wZSkge1xuXHQkc2NvcGUuZ2V0Q2xpZW50SW5mbyA9IGZ1bmN0aW9uKCl7XG5cdH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdiYXNpY2luZm8nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbWlzc2luZ2Zvcm1zJywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL21pc3Npbmdmb3Jtcy9taXNzaW5nZm9ybXMuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzY29wZSk7XG4gICAgICAgICAgc2NvcGUuZ2V0QkMgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2hlbGxvJyk7XG4gICAgICAgICAgICAkaHR0cC5nZXQoYC9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUvY29tcGxldGU/Zmlyc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5GaXJzdF9OYW1lfSZsYXN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uTGFzdF9OYW1lfSZET0I9JHtzY29wZS5jdXJyZW50UGVyc29uLkRPQn1gKVxuXG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLmdldFNTQyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8nKTtcbiAgICAgICAgICAgICRodHRwLmdldChgL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZS9jb21wbGV0ZT9maXJzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkZpcnN0X05hbWV9Jmxhc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5MYXN0X05hbWV9JkRPQj0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRE9CfWApXG5cbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Zvcm0gTGlzdCcsIHN0YXRlOiAnZm9ybWxpc3QnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0dldCBTdGFydGVkJywgc3RhdGU6ICdzdGFydCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSm9icyBNYXAnLCBzdGF0ZTogJ2pvYnNNYXAnfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iXX0=
