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
        controller: 'jobsMapCtrl',
        resolve: {
            jobs: function jobs(jobLocsFactory) {
                return jobLocsFactory.getJobs();
            }
        }
    });
});

app.controller('jobsMapCtrl', function ($scope, jobLocsFactory, jobs) {
    var idCounter = 0;
    $scope.infoWindowArrays = [];

    angular.extend($scope, {
        map: {
            center: {
                latitude: 38.627,
                longitude: -90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function click(map, eventName, model, originalEventArgs, $scope) {
                    // console.log('hey there');
                    // console.log('Marker was clicked' + map)
                    //                     console.log('eventName' + eventName)
                    //                     console.log('model' + model)
                    //                     console.log('originalEventArgs' + originalEventArgs)

                    // var e = originalEventArgs[0];
                    // var lat = e.latLng.lat(),lon = e.latLng.lng();
                    // var marker = {
                    //     id: Date.now(),
                    //     coords: {
                    //         latitude: lat,
                    //         longitude: lon
                    //     },
                    // };
                    // $scope.map.markers.push(marker);
                }
            }
        }
    });

    markerInit(jobs, idCounter, $scope);

    function markerInit(jobs, idCounter, $scope) {
        console.log('heres the $scope', $scope);
        var infoWindowsArrays = $scope.infoWindowArrays;

        jobs.forEach(function (job) {
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>' + 'Name of Employer: </b>' + job.employer + '</div>' + '<div ><b>' + 'Description: </b>' + job.description + '</div>' + '<div > <b>' + 'Industry: </b>' + job.industry + '</div>',

                maxWidth: 200
            });
            // console.log('heres the var infoWindowsArrays ', infoWindowsArrays)
            infoWindowsArrays.push(newInfoWindow);

            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                },
                markerEvents: {
                    click: function click(marker, eventName, model, originalEventArgs) {
                        // console.log('hey there');
                        console.log('heres infoWindowArrays ,', infoWindowsArrays[model.idKey]);
                        infoWindowsArrays[model.idKey].open(model.map, marker);
                        console.log('Marker was clicked', marker);
                        console.log('heres this ', this);
                        console.log('eventName', eventName);
                        console.log('model', model);
                        console.log('originalEventArgs', originalEventArgs);
                        console.log('heres the var infoWindowsArrays click event in marker', infoWindowsArrays);
                    }
                }
            };
            $scope.map.markers.push(marker);
            idCounter++;
        });
    }

    $scope.seeInfo = function (marker) {
        console.log('here is the marker you clicked', marker);
    };
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
                window.open('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
            scope.getSSC = function () {
                console.log('hello');
                window.open('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
            scope.getFS = function () {
                window.open('/api/forms/food-stamps/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJkb2NzL2RvY3MuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9QaWNzLmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJzaG93Rm9ybXMiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJyZXNvbHZlIiwiam9icyIsImpvYkxvY3NGYWN0b3J5IiwiZ2V0Sm9icyIsImlkQ291bnRlciIsImluZm9XaW5kb3dBcnJheXMiLCJleHRlbmQiLCJtYXAiLCJjZW50ZXIiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsInpvb20iLCJtYXJrZXJzIiwiZXZlbnRzIiwiY2xpY2siLCJldmVudE5hbWUiLCJtb2RlbCIsIm9yaWdpbmFsRXZlbnRBcmdzIiwibWFya2VySW5pdCIsImxvZyIsImluZm9XaW5kb3dzQXJyYXlzIiwiZm9yRWFjaCIsIm5ld0luZm9XaW5kb3ciLCJnb29nbGUiLCJtYXBzIiwiSW5mb1dpbmRvdyIsImNvbnRlbnQiLCJqb2IiLCJlbXBsb3llciIsImRlc2NyaXB0aW9uIiwiaW5kdXN0cnkiLCJtYXhXaWR0aCIsIm1hcmtlciIsImNvb3JkcyIsIm1hcmtlckV2ZW50cyIsImlkS2V5Iiwic2VlSW5mbyIsInJlcyIsInBvc3ROZXdKb2IiLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldENsaWVudEluZm8iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwibGluayIsImdldEJDIiwiRmlyc3RfTmFtZSIsIkxhc3RfTmFtZSIsImdldFNTQyIsImdldEZTIiwiaXRlbXMiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBQSxPQUFBQyxHQUFBLEdBQUFDLFFBQUFDLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLG1CQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVB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QUFzRSxPQUFBLFdBQUEsRUFBQXRFLE9BQUEsVUFBQSxFQUZBLEVBR0EsRUFBQXNFLE9BQUEsYUFBQSxFQUFBdEUsT0FBQSxPQUFBLEVBSEEsRUFJQSxFQUFBc0UsT0FBQSxVQUFBLEVBQUF0RSxPQUFBLFNBQUEsRUFKQSxDQUFBOztBQU9BcUosa0JBQUE5SSxJQUFBLEdBQUEsSUFBQTs7QUFFQThJLGtCQUFBUSxVQUFBLEdBQUEsWUFBQTtBQUNBLHVCQUFBaEssWUFBQU0sZUFBQSxFQUFBO0FBQ0EsYUFGQTs7QUFJQWtKLGtCQUFBckYsTUFBQSxHQUFBLFlBQUE7QUFDQW5FLDRCQUFBbUUsTUFBQSxHQUFBMUQsSUFBQSxDQUFBLFlBQUE7QUFDQVIsMkJBQUFVLEVBQUEsQ0FBQSxNQUFBO0FBQ0EsaUJBRkE7QUFHQSxhQUpBOztBQU1BLGdCQUFBc0osVUFBQSxTQUFBQSxPQUFBLEdBQUE7QUFDQWpLLDRCQUFBUSxlQUFBLEdBQUFDLElBQUEsQ0FBQSxVQUFBQyxJQUFBLEVBQUE7QUFDQThJLDBCQUFBOUksSUFBQSxHQUFBQSxJQUFBO0FBQ0EsaUJBRkE7QUFHQSxhQUpBOztBQU1BLGdCQUFBd0osYUFBQSxTQUFBQSxVQUFBLEdBQUE7QUFDQVYsc0JBQUE5SSxJQUFBLEdBQUEsSUFBQTtBQUNBLGFBRkE7O0FBSUF1Sjs7QUFFQTdLLHVCQUFBQyxHQUFBLENBQUEwRCxZQUFBUCxZQUFBLEVBQUF5SCxPQUFBO0FBQ0E3Syx1QkFBQUMsR0FBQSxDQUFBMEQsWUFBQUwsYUFBQSxFQUFBd0gsVUFBQTtBQUNBOUssdUJBQUFDLEdBQUEsQ0FBQTBELFlBQUFKLGNBQUEsRUFBQXVILFVBQUE7QUFFQTs7QUF6Q0EsS0FBQTtBQTZDQSxDQS9DQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywndWlHbWFwZ29vZ2xlLW1hcHMnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9hYm91dCcpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgbGlzdGVuaW5nIHRvIGVycm9ycyBicm9hZGNhc3RlZCBieSB1aS1yb3V0ZXIsIHVzdWFsbHkgb3JpZ2luYXRpbmcgZnJvbSByZXNvbHZlc1xuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VFcnJvcicsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcywgdGhyb3duRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKGBUaGUgZm9sbG93aW5nIGVycm9yIHdhcyB0aHJvd24gYnkgdWktcm91dGVyIHdoaWxlIHRyYW5zaXRpb25pbmcgdG8gc3RhdGUgXCIke3RvU3RhdGUubmFtZX1cIi4gVGhlIG9yaWdpbiBvZiB0aGlzIGVycm9yIGlzIHByb2JhYmx5IGEgcmVzb2x2ZSBmdW5jdGlvbjpgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aHJvd25FcnJvcik7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIFBpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKFBpY3MpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Zvcm1saXN0Jywge1xuICAgICAgICB1cmw6ICcvZ292Zm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcm1saXN0L2Zvcm1saXN0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUN0cmwnXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1DdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2dvdmVybm1lbnRmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUNvbnRyb2xsZXInXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1Db250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3JtcycsIHtcbiAgICAgICAgdXJsOiAnL2Zvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3Jtcy9mb3Jtcy5odG1sJyxcbiAgICB9KSAgICBcbiAgICAuc3RhdGUoJ2Zvcm1zLmxvb2t1cCcsIHtcbiAgICAgICAgdXJsOiAnL2xvb2t1cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2pzL2Zvcm1zL3RlbXBsYXRlcy9sb29rdXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb29rdXBDdGwnXG4gICAgfSlcbn0pOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0YXJ0Jywge1xuICAgICAgICB1cmw6ICcvc3RhcnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2dldFN0YXJ0ZWQvc3RhcnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTdGFydEN0cmwnXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1N0YXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApe1xuICAgICRzY29wZS5zaG93Rm9ybXMgPSBmYWxzZTtcblxuICAgICRzY29wZS5vcHRpb25zID0gW1xuICAgICAgICB7dmFsdWU6ICcnLCBsYWJlbDogJ2Nob29zZSBvbmUnfSxcbiAgICAgICAge3ZhbHVlOiB0cnVlLCBsYWJlbDogJ3RydWUnfSxcbiAgICAgICAge3ZhbHVlOiBmYWxzZSwgbGFiZWw6ICdmYWxzZSd9XG4gICAgXTtcblxuICAgICRzY29wZS51cGRhdGluZ0luZm8gPSBmdW5jdGlvbigpe1xuXG4gICAgICAgIHZhciBpbmZvcm1hdGlvbiA9IHtcbiAgICAgICAgICAgIGZpcnN0TmFtZTogJHNjb3BlLmN1cnJlbnRQZXJzb24uZmlyc3ROYW1lLFxuICAgICAgICAgICAgbGFzdE5hbWU6ICRzY29wZS5jdXJyZW50UGVyc29uLmxhc3ROYW1lLFxuICAgICAgICAgICAgU1NOOiAkc2NvcGUuY3VycmVudFBlcnNvbi5TU04sXG4gICAgICAgICAgICBET0I6ICRzY29wZS5jdXJyZW50UGVyc29uLkRPQixcbiAgICAgICAgICAgIGdlbmRlcjogJHNjb3BlLmN1cnJlbnRQZXJzb24uZ2VuZGVyLFxuICAgICAgICAgICAgcmFjZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ucmFjZSxcbiAgICAgICAgICAgIHZldGVyYW5TdGF0dXM6ICRzY29wZS5jdXJyZW50UGVyc29uLnZldGVyYW5TdGF0dXMsXG4gICAgICAgICAgICBwaG9uZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ucGhvbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHNjb3BlLm5lZWRzUG9zdCkge1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnYXBpL2NsaWVudHMnLCBpbmZvcm1hdGlvbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZWRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaHR0cC5wdXQoJ2FwaS9jbGllbnRzJywgaW5mb3JtYXRpb24pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVkUGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgJCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKGRvY3VtZW50KS5oZWlnaHQoKSB9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNoZWNrREIgPSBmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvY2xpZW50cycsIHtcbiAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgIGZpcnN0TmFtZTogcGVyc29uLmZpcnN0TmFtZSxcbiAgICAgICAgICAgICAgICBsYXN0TmFtZTogcGVyc29uLmxhc3ROYW1lLFxuICAgICAgICAgICAgICAgIERPQjogcGVyc29uLkRPQlxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgaWYgKHBlcnNvbi5kYXRhLmlkKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZWVkc1B1dCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5uZWVkc1Bvc3QgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmlzQ3VycmVudFBlcnNvbiA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0Zvcm1zID0gdHJ1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe3Njcm9sbFRvcDogJChkb2N1bWVudCkuaGVpZ2h0KCkgfSwgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRVJSXCIsIGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2pvYnNNYXAnLCB7XG4gICAgICAgIHVybDogJy9qb2JzLW1hcCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnLi9qcy9nb29nbGVNYXBzL2dvb2dsZU1hcHMuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdqb2JzTWFwQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGpvYnM6IGZ1bmN0aW9uKGpvYkxvY3NGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gam9iTG9jc0ZhY3RvcnkuZ2V0Sm9icygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuXG5hcHAuY29udHJvbGxlciggJ2pvYnNNYXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBqb2JMb2NzRmFjdG9yeSwgam9icyl7XG4gICAgdmFyIGlkQ291bnRlciA9IDA7XG4gICAgJHNjb3BlLmluZm9XaW5kb3dBcnJheXMgPSBbXTtcblxuICAgICBhbmd1bGFyLmV4dGVuZCgkc2NvcGUsIHtcbiAgICAgICAgbWFwOiB7XG4gICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXRpdHVkZTogMzguNjI3LFxuICAgICAgICAgICAgICAgIGxvbmdpdHVkZTotOTAuMTk3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgem9vbTogMTIsXG4gICAgICAgICAgICBtYXJrZXJzOiBbXSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAobWFwLCBldmVudE5hbWUsIG1vZGVsLCBvcmlnaW5hbEV2ZW50QXJncywgJHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXkgdGhlcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ01hcmtlciB3YXMgY2xpY2tlZCcgKyBtYXApXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50TmFtZScgKyBldmVudE5hbWUpXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vZGVsJyArIG1vZGVsKVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcmlnaW5hbEV2ZW50QXJncycgKyBvcmlnaW5hbEV2ZW50QXJncylcblxuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgZSA9IG9yaWdpbmFsRXZlbnRBcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgbGF0ID0gZS5sYXRMbmcubGF0KCksbG9uID0gZS5sYXRMbmcubG5nKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciBtYXJrZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBpZDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGxhdGl0dWRlOiBsYXQsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgbG9uZ2l0dWRlOiBsb25cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIH07XG4gICAgICAgICAgICAgICAgICAgIC8vICRzY29wZS5tYXAubWFya2Vycy5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtYXJrZXJJbml0KGpvYnMsIGlkQ291bnRlciwgJHNjb3BlKTtcblxuICAgIGZ1bmN0aW9uIG1hcmtlckluaXQgKGpvYnMsIGlkQ291bnRlciwgJHNjb3BlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoZXJlcyB0aGUgJHNjb3BlJywgJHNjb3BlKTtcbiAgICAgICAgdmFyIGluZm9XaW5kb3dzQXJyYXlzID0gJHNjb3BlLmluZm9XaW5kb3dBcnJheXM7XG5cbiAgICAgICAgam9icy5mb3JFYWNoKGpvYiA9PiB7XG4gICAgICAgICAgICB2YXIgbmV3SW5mb1dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KHtcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnPGRpdiBpZD1cImNvbnRlbnRcIj4gPGI+JytcbiAgICAgICAgICAgICAgICAnTmFtZSBvZiBFbXBsb3llcjogPC9iPicgKyBqb2IuZW1wbG95ZXIgK1xuICAgICAgICAgICAgJzwvZGl2PicrJzxkaXYgPjxiPicrXG4gICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uOiA8L2I+JyArIGpvYi5kZXNjcmlwdGlvbiArXG4gICAgICAgICAgICAnPC9kaXY+JysnPGRpdiA+IDxiPicrXG4gICAgICAgICAgICAgICAgJ0luZHVzdHJ5OiA8L2I+JyArIGpvYi5pbmR1c3RyeSArXG4gICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICAgICAgLFxuICAgICAgICAgICAgICAgIG1heFdpZHRoOiAyMDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZXMgdGhlIHZhciBpbmZvV2luZG93c0FycmF5cyAnLCBpbmZvV2luZG93c0FycmF5cylcbiAgICAgICAgICAgIGluZm9XaW5kb3dzQXJyYXlzLnB1c2gobmV3SW5mb1dpbmRvdylcblxuICAgICAgICAgICAgdmFyIG1hcmtlciA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWRDb3VudGVyLFxuICAgICAgICAgICAgICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICBsYXRpdHVkZTogam9iLmxhdGl0dWRlLFxuICAgICAgICAgICAgICAgICAgICBsb25naXR1ZGU6IGpvYi5sb25naXR1ZGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1hcmtlckV2ZW50czoge1xuICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKG1hcmtlciwgZXZlbnROYW1lLCBtb2RlbCwgb3JpZ2luYWxFdmVudEFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXkgdGhlcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZXJlcyBpbmZvV2luZG93QXJyYXlzICwnLCBpbmZvV2luZG93c0FycmF5c1ttb2RlbC5pZEtleV0pXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmZvV2luZG93c0FycmF5c1ttb2RlbC5pZEtleV0ub3Blbihtb2RlbC5tYXAsbWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYXJrZXIgd2FzIGNsaWNrZWQnLCBtYXJrZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaGVyZXMgdGhpcyAnLCB0aGlzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50TmFtZScsIGV2ZW50TmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RlbCcsIG1vZGVsKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29yaWdpbmFsRXZlbnRBcmdzJywgb3JpZ2luYWxFdmVudEFyZ3MpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaGVyZXMgdGhlIHZhciBpbmZvV2luZG93c0FycmF5cyBjbGljayBldmVudCBpbiBtYXJrZXInLCBpbmZvV2luZG93c0FycmF5cylcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gaW5mb3dpbmRvdzogbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coe1xuICAgICAgICAgICAgICAgIC8vICAgICBjb250ZW50OiAnSGV5IHRoZXJlJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgbWF4V2lkdGg6IDIwMFxuICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJHNjb3BlLm1hcC5tYXJrZXJzLnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgIGlkQ291bnRlcisrO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgICRzY29wZS5zZWVJbmZvID0gZnVuY3Rpb24obWFya2VyKXtcbiAgICAgICAgY29uc29sZS5sb2coJ2hlcmUgaXMgdGhlIG1hcmtlciB5b3UgY2xpY2tlZCcsIG1hcmtlcilcbiAgICB9XG5cbn0pXG5cbmFwcC5mYWN0b3J5KCdqb2JMb2NzRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgam9iTG9jc0ZhY3RvcnkgPSB7fTtcblxuICAgIGpvYkxvY3NGYWN0b3J5LmdldEpvYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2pvYkxvY3MnKVxuICAgICAgICAudGhlbihyZXMgPT4gcmVzLmRhdGEpXG4gICAgfVxuXG4gICAgam9iTG9jc0ZhY3RvcnkucG9zdE5ld0pvYiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2pvYkxvY3MnKVxuICAgIH1cbiAgICByZXR1cm4gam9iTG9jc0ZhY3Rvcnk7XG59KVxuLy8gYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbi8vICAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuLy8gICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgIH07XG5cbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbi8vICAgICB9O1xuXG4vLyB9KTtcblxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5QWROM1RmRTEza3hPRkJSY2dPUWlSU3NTczFfVEZseThzJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG4iLCIvLyBhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuLy8gICAgICAgICB1cmw6ICcvJyxcbi8vICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbi8vICAgICB9KTtcbi8vIH0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL2ZhYmlhbmRlbWJza2kuZmlsZXMud29yZHByZXNzLmNvbS8yMDE1LzAzL3VzZXJzLWZhYmlhbnAtZG9jdW1lbnRzLWpvYnMtYXJjaC1zaGloLW5ldWVyLW9yZG5lci1pbnN0YWxsYXRpb242LmpwZz93PTY0MCZoPTM5MiZjcm9wPTEnLFxuICAgICAgICAnaHR0cDovL2JlYXR0aGU5dG81LmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxMi8wOC9qb2ItU2VhcmNoLTEuanBnJyxcbiAgICAgICAgJ2h0dHA6Ly9ocGN2dC5vcmcvd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDIvaGFuZHMtaG9sZGluZy1ob3VzZS1pbWFnZS5qcGcnLFxuICAgIF07XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdMb29rdXBDdGwnLCBmdW5jdGlvbigkc2NvcGUpIHtcblx0JHNjb3BlLmdldENsaWVudEluZm8gPSBmdW5jdGlvbigpe1xuXHR9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnYmFzaWNpbmZvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvYmFzaWNJbmZvL2Jhc2ljaW5mby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ21pc3Npbmdmb3JtcycsIGZ1bmN0aW9uICgkaHR0cCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSl7XG4gICAgICAgICAgY29uc29sZS5sb2coc2NvcGUpO1xuICAgICAgICAgIHNjb3BlLmdldEJDID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbycpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oYC9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUvY29tcGxldGU/Zmlyc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5GaXJzdF9OYW1lfSZsYXN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uTGFzdF9OYW1lfSZET0I9JHtzY29wZS5jdXJyZW50UGVyc29uLkRPQn1gKVxuXG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLmdldFNTQyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8nKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGAvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlL2NvbXBsZXRlP2ZpcnN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRmlyc3RfTmFtZX0mbGFzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkxhc3RfTmFtZX0mRE9CPSR7c2NvcGUuY3VycmVudFBlcnNvbi5ET0J9YCk7XG5cblxuICAgICAgICAgIH1cbiAgICAgICAgICBzY29wZS5nZXRGUyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihgL2FwaS9mb3Jtcy9mb29kLXN0YW1wcy9jb21wbGV0ZT9maXJzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkZpcnN0X05hbWV9Jmxhc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5MYXN0X05hbWV9JkRPQj0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRE9CfWApO1xuXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdGb3JtIExpc3QnLCBzdGF0ZTogJ2Zvcm1saXN0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdHZXQgU3RhcnRlZCcsIHN0YXRlOiAnc3RhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0pvYnMgTWFwJywgc3RhdGU6ICdqb2JzTWFwJ31cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIl19
