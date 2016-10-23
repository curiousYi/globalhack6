'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'uiGmapgoogle-maps']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
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

app.controller('AboutController', function ($scope, FullstackPics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(FullstackPics);
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
        }).catch(function (error) {
            console.error("ERR", error);
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('jobsMap', {
        url: '/jobs-map',
        templateUrl: './js/googleMaps/googleMaps.html',
        controller: 'jobsMapCtrl',
        resolve: {
            jobs: function jobs(jobLocsFactory) {
                return jobLocsFactory.getJobs();
            }
        }
    });
});

app.controller('jobsMapCtrl', function ($scope, jobLocsFactory, jobs) {
    angular.extend($scope, {
        map: {
            center: {
                latitude: 38.627,
                longitude: -90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function click(map, eventName, originalEventArgs) {
                    var e = originalEventArgs[0];
                    var lat = e.latLng.lat(),
                        lon = e.latLng.lng();
                    var marker = {
                        id: Date.now(),
                        coords: {
                            latitude: lat,
                            longitude: lon
                        }
                    };
                    $scope.map.markers.push(marker);
                }
            }
        }
    });

    markerInit(jobs);

    function markerInit(jobs) {
        jobs.forEach(function (job) {
            var marker = {
                id: Date.now(),
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                }
            };
            $scope.map.markers.push(marker);
        });
    }
});

app.factory('jobLocsFactory', function ($http) {
    var jobLocsFactory = {};

    jobLocsFactory.getJobs = function () {
        return $http.get('/api/jobLocs').then(function (res) {
            return res.data;
        });
    };

    jobLocsFactory.postNewJob = function () {
        return $http.post('/api/jobLocs');
    };
    return jobLocsFactory;
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

app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });
});

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

app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D', 'Yes, I think we\'ve met before.', 'Gimme 3 mins... I just grabbed this really dope frittata', 'If Cooper could offer only one piece of advice, it would be to nevSQUIRREL!'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
    };
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

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
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

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'About', state: 'about' }, { label: 'Form List', state: 'formlist' }, { label: 'Get Started', state: 'start' }, { label: 'Members Only', state: 'membersOnly', auth: true }, { label: 'Jobs Map', state: 'jobsMap' }];

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SYW5kb21HcmVldGluZ3MuanMiLCJmb3Jtcy9jb250cm9sbGVyL0xvb2t1cEN0bC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Jhc2ljSW5mby9iYXNpY2luZm8uanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL21pc3Npbmdmb3Jtcy9taXNzaW5nZm9ybXMuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCIkc3RhdGVQcm92aWRlciIsInVybCIsImNvbnRyb2xsZXIiLCJ0ZW1wbGF0ZVVybCIsIiRzY29wZSIsIkZ1bGxzdGFja1BpY3MiLCJpbWFnZXMiLCJfIiwic2h1ZmZsZSIsIiRodHRwIiwiZ2V0Q2VydCIsImdldCIsInJlc3BvbnNlVHlwZSIsInN1Y2Nlc3MiLCJmaWxlIiwiQmxvYiIsInR5cGUiLCJmaWxlVVJMIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwib3BlbiIsImNhdGNoIiwiZ2V0U29jaWFsQ2VydCIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJzZXJ2aWNlIiwiU2Vzc2lvbiIsIm9uU3VjY2Vzc2Z1bExvZ2luIiwiY3JlYXRlIiwiZnJvbVNlcnZlciIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwib3B0aW9ucyIsInZhbHVlIiwibGFiZWwiLCJ1cGRhdGluZ0luZm8iLCJpbmZvcm1hdGlvbiIsImZpcnN0TmFtZSIsImN1cnJlbnRQZXJzb24iLCJsYXN0TmFtZSIsIlNTTiIsIkRPQiIsImdlbmRlciIsInJhY2UiLCJ2ZXRlcmFuU3RhdHVzIiwicGhvbmUiLCJuZWVkc1Bvc3QiLCJwZXJzb24iLCJ1cGRhdGVkUGVyc29uIiwicHV0Iiwic2hvd0Zvcm1zIiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJyZXNvbHZlIiwiam9icyIsImpvYkxvY3NGYWN0b3J5IiwiZ2V0Sm9icyIsImV4dGVuZCIsIm1hcCIsImNlbnRlciIsImxhdGl0dWRlIiwibG9uZ2l0dWRlIiwiem9vbSIsIm1hcmtlcnMiLCJldmVudHMiLCJjbGljayIsImV2ZW50TmFtZSIsIm9yaWdpbmFsRXZlbnRBcmdzIiwiZSIsImxhdCIsImxhdExuZyIsImxvbiIsImxuZyIsIm1hcmtlciIsIkRhdGUiLCJub3ciLCJjb29yZHMiLCJtYXJrZXJJbml0IiwiZm9yRWFjaCIsImpvYiIsInJlcyIsInBvc3ROZXdKb2IiLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldFJhbmRvbUZyb21BcnJheSIsImFyciIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsImxlbmd0aCIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwiZ2V0Q2xpZW50SW5mbyIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwiUmFuZG9tR3JlZXRpbmdzIiwibGluayIsInNjb3BlIiwiZ3JlZXRpbmciLCJpdGVtcyIsImF1dGgiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBQSxPQUFBQyxHQUFBLEdBQUFDLFFBQUFDLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLG1CQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFD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RUFBQThHLFVBQUE7QUFFQTs7QUEzQ0EsS0FBQTtBQStDQSxDQWpEQTs7QUNBQWpMLElBQUF1SyxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0FDLGtCQUFBLEdBREE7QUFFQWpJLHFCQUFBO0FBRkEsS0FBQTtBQUlBLENBTEEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsJ3VpR21hcGdvb2dsZS1tYXBzJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2dvdmVybm1lbnRmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUNvbnRyb2xsZXInXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1Db250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ybWxpc3QnLCB7XG4gICAgICAgIHVybDogJy9nb3Zmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ybWxpc3QvZm9ybWxpc3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGb3JtQ3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ybUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuZ2V0Q2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgICAgICAkc2NvcGUuZ2V0U29jaWFsQ2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9zb2NpYWwtc2VjdXJpdHknLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Zvcm1zJywge1xuICAgICAgICB1cmw6ICcvZm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcm1zL2Zvcm1zLmh0bWwnLFxuICAgIH0pICAgIFxuICAgIC5zdGF0ZSgnZm9ybXMubG9va3VwJywge1xuICAgICAgICB1cmw6ICcvbG9va3VwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvanMvZm9ybXMvdGVtcGxhdGVzL2xvb2t1cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvb2t1cEN0bCdcbiAgICB9KVxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc3RhcnQnLCB7XG4gICAgICAgIHVybDogJy9zdGFydCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2V0U3RhcnRlZC9zdGFydC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0YXJ0Q3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignU3RhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG5cbiAgICAkc2NvcGUub3B0aW9ucyA9IFtcbiAgICAgICAge3ZhbHVlOiAnJywgbGFiZWw6ICdjaG9vc2Ugb25lJ30sXG4gICAgICAgIHt2YWx1ZTogdHJ1ZSwgbGFiZWw6ICd0cnVlJ30sIFxuICAgICAgICB7dmFsdWU6IGZhbHNlLCBsYWJlbDogJ2ZhbHNlJ31cbiAgICBdO1xuXG4gICAgJHNjb3BlLnVwZGF0aW5nSW5mbyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBpbmZvcm1hdGlvbiA9IHtcbiAgICAgICAgICAgIGZpcnN0TmFtZTogJHNjb3BlLmN1cnJlbnRQZXJzb24uZmlyc3ROYW1lLCBcbiAgICAgICAgICAgIGxhc3ROYW1lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5sYXN0TmFtZSwgXG4gICAgICAgICAgICBTU046ICRzY29wZS5jdXJyZW50UGVyc29uLlNTTixcbiAgICAgICAgICAgIERPQjogJHNjb3BlLmN1cnJlbnRQZXJzb24uRE9CLFxuICAgICAgICAgICAgZ2VuZGVyOiAkc2NvcGUuY3VycmVudFBlcnNvbi5nZW5kZXIsXG4gICAgICAgICAgICByYWNlOiAkc2NvcGUuY3VycmVudFBlcnNvbi5yYWNlLFxuICAgICAgICAgICAgdmV0ZXJhblN0YXR1czogJHNjb3BlLmN1cnJlbnRQZXJzb24udmV0ZXJhblN0YXR1cyxcbiAgICAgICAgICAgIHBob25lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5waG9uZVxuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUubmVlZHNQb3N0KSB7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KCdhcGkvY2xpZW50cycsIGluZm9ybWF0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlZFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRodHRwLnB1dCgnYXBpL2NsaWVudHMnLCBpbmZvcm1hdGlvbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZWRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNob3dGb3JtcyA9IHRydWU7IFxuICAgIH07XG5cbiAgICAkc2NvcGUuY2hlY2tEQiA9IGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9jbGllbnRzJywge1xuICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgZmlyc3ROYW1lOiBwZXJzb24uZmlyc3ROYW1lLCBcbiAgICAgICAgICAgICAgICBsYXN0TmFtZTogcGVyc29uLmxhc3ROYW1lLFxuICAgICAgICAgICAgICAgIERPQjogcGVyc29uLkRPQlxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgaWYgKHBlcnNvbi5kYXRhLmlkKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZWVkc1B1dCA9IHRydWU7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmVlZHNQb3N0ID0gdHJ1ZTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuaXNDdXJyZW50UGVyc29uID0gdHJ1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJcIiwgZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdqb2JzTWFwJywge1xuICAgICAgICB1cmw6ICcvam9icy1tYXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy4vanMvZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnam9ic01hcEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBqb2JzOiBmdW5jdGlvbihqb2JMb2NzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGpvYkxvY3NGYWN0b3J5LmdldEpvYnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoICdqb2JzTWFwQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgam9iTG9jc0ZhY3RvcnksIGpvYnMpe1xuICAgICBhbmd1bGFyLmV4dGVuZCgkc2NvcGUsIHtcbiAgICAgICAgbWFwOiB7XG4gICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXRpdHVkZTogMzguNjI3LFxuICAgICAgICAgICAgICAgIGxvbmdpdHVkZTotOTAuMTk3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgem9vbTogMTIsXG4gICAgICAgICAgICBtYXJrZXJzOiBbXSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAobWFwLCBldmVudE5hbWUsIG9yaWdpbmFsRXZlbnRBcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gb3JpZ2luYWxFdmVudEFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXQgPSBlLmxhdExuZy5sYXQoKSxsb24gPSBlLmxhdExuZy5sbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcmtlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29vcmRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0aXR1ZGU6IGxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb25naXR1ZGU6IGxvblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm1hcC5tYXJrZXJzLnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIG1hcmtlckluaXQoam9icyk7XG5cbiAgICBmdW5jdGlvbiBtYXJrZXJJbml0IChqb2JzKSB7XG4gICAgICAgIGpvYnMuZm9yRWFjaChqb2IgPT4ge1xuICAgICAgICAgICAgdmFyIG1hcmtlciA9IHtcbiAgICAgICAgICAgICAgICBpZDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgICAgICAgICAgbGF0aXR1ZGU6IGpvYi5sYXRpdHVkZSxcbiAgICAgICAgICAgICAgICAgICAgbG9uZ2l0dWRlOiBqb2IubG9uZ2l0dWRlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkc2NvcGUubWFwLm1hcmtlcnMucHVzaChtYXJrZXIpO1xuICAgICAgICB9KVxuICAgIH1cbn0pXG5cbmFwcC5mYWN0b3J5KCdqb2JMb2NzRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgam9iTG9jc0ZhY3RvcnkgPSB7fTtcblxuICAgIGpvYkxvY3NGYWN0b3J5LmdldEpvYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2pvYkxvY3MnKVxuICAgICAgICAudGhlbihyZXMgPT4gcmVzLmRhdGEpXG4gICAgfVxuXG4gICAgam9iTG9jc0ZhY3RvcnkucG9zdE5ld0pvYiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2pvYkxvY3MnKVxuICAgIH1cbiAgICByZXR1cm4gam9iTG9jc0ZhY3Rvcnk7XG59KVxuLy8gYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbi8vICAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuLy8gICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgIH07XG5cbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbi8vICAgICB9O1xuXG4vLyB9KTtcblxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5QWROM1RmRTEza3hPRkJSY2dPUWlSU3NTczFfVEZseThzJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnLFxuICAgICAgICAnWWVzLCBJIHRoaW5rIHdlXFwndmUgbWV0IGJlZm9yZS4nLFxuICAgICAgICAnR2ltbWUgMyBtaW5zLi4uIEkganVzdCBncmFiYmVkIHRoaXMgcmVhbGx5IGRvcGUgZnJpdHRhdGEnLFxuICAgICAgICAnSWYgQ29vcGVyIGNvdWxkIG9mZmVyIG9ubHkgb25lIHBpZWNlIG9mIGFkdmljZSwgaXQgd291bGQgYmUgdG8gbmV2U1FVSVJSRUwhJyxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdMb29rdXBDdGwnLCBmdW5jdGlvbigkc2NvcGUpIHtcblx0JHNjb3BlLmdldENsaWVudEluZm8gPSBmdW5jdGlvbigpe1xuXHR9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnYmFzaWNpbmZvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvYmFzaWNJbmZvL2Jhc2ljaW5mby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ21pc3Npbmdmb3JtcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL21pc3Npbmdmb3Jtcy9taXNzaW5nZm9ybXMuaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnRm9ybSBMaXN0Jywgc3RhdGU6ICdmb3JtbGlzdCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnR2V0IFN0YXJ0ZWQnLCBzdGF0ZTogJ3N0YXJ0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdKb2JzIE1hcCcsIHN0YXRlOiAnam9ic01hcCd9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTtcbiJdfQ==
