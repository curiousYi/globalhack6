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

// app.config(function ($stateProvider) {
//     $stateProvider.state('home', {
//         url: '/',
//         templateUrl: 'js/home/home.html'
//     });
// });

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

app.controller('LookupCtl', function ($scope) {
    $scope.getClientInfo = function () {};
});
app.factory('Pics', function () {
    return ['https://fabiandembski.files.wordpress.com/2015/03/users-fabianp-documents-jobs-arch-shih-neuer-ordner-installation6.jpg?w=640&h=392&crop=1', 'http://beatthe9to5.com/wp-content/uploads/2012/08/job-Search-1.jpg', 'http://hpcvt.org/wp-content/uploads/2014/02/hands-holding-house-image.jpg'];
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
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiaG9tZS9ob21lLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZmFjdG9yaWVzL1BpY3MuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCJzaG93Rm9ybXMiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJyZXNvbHZlIiwiam9icyIsImpvYkxvY3NGYWN0b3J5IiwiZ2V0Sm9icyIsImlkQ291bnRlciIsImluZm9XaW5kb3dBcnJheXMiLCJleHRlbmQiLCJtYXAiLCJjZW50ZXIiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsInpvb20iLCJtYXJrZXJzIiwiZXZlbnRzIiwiY2xpY2siLCJldmVudE5hbWUiLCJtb2RlbCIsIm9yaWdpbmFsRXZlbnRBcmdzIiwibWFya2VySW5pdCIsImxvZyIsImluZm9XaW5kb3dzQXJyYXlzIiwiZm9yRWFjaCIsIm5ld0luZm9XaW5kb3ciLCJnb29nbGUiLCJtYXBzIiwiSW5mb1dpbmRvdyIsImNvbnRlbnQiLCJqb2IiLCJlbXBsb3llciIsImRlc2NyaXB0aW9uIiwiaW5kdXN0cnkiLCJtYXhXaWR0aCIsIm1hcmtlciIsImNvb3JkcyIsIm1hcmtlckV2ZW50cyIsImlkS2V5Iiwic2VlSW5mbyIsInJlcyIsInBvc3ROZXdKb2IiLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldENsaWVudEluZm8iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwibGluayIsIml0ZW1zIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxtQkFBQSxDQUFBLENBQUE7O0FBRUFGLElBQUFHLE1BQUEsQ0FBQSxVQUFBQyxrQkFBQSxFQUFBQyxpQkFBQSxFQUFBO0FBQ0E7QUFDQUEsc0JBQUFDLFNBQUEs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SixjQUFBLEVBQUFrSCxVQUFBO0FBRUE7O0FBekNBLEtBQUE7QUE2Q0EsQ0EvQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsJ3VpR21hcGdvb2dsZS1tYXBzJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvYWJvdXQnKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShQaWNzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuICAgICAgICB1cmw6ICcvZ292ZXJubWVudGZvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGb3JtQ29udHJvbGxlcidcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ybUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuZ2V0Q2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgICAgICAkc2NvcGUuZ2V0U29jaWFsQ2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9zb2NpYWwtc2VjdXJpdHknLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3JtbGlzdCcsIHtcbiAgICAgICAgdXJsOiAnL2dvdmZvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3JtbGlzdC9mb3JtbGlzdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Zvcm1DdHJsJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JtQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApe1xuICAgICRzY29wZS5nZXRDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlJywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgICAgICRzY29wZS5nZXRTb2NpYWxDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL3NvY2lhbC1zZWN1cml0eScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ybXMnLCB7XG4gICAgICAgIHVybDogJy9mb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ybXMvZm9ybXMuaHRtbCcsXG4gICAgfSkgICAgXG4gICAgLnN0YXRlKCdmb3Jtcy5sb29rdXAnLCB7XG4gICAgICAgIHVybDogJy9sb29rdXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9qcy9mb3Jtcy90ZW1wbGF0ZXMvbG9va3VwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9va3VwQ3RsJ1xuICAgIH0pXG59KTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0oKSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdGFydCcsIHtcbiAgICAgICAgdXJsOiAnL3N0YXJ0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nZXRTdGFydGVkL3N0YXJ0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RhcnRDdHJsJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTdGFydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcblxuICAgICRzY29wZS5vcHRpb25zID0gW1xuICAgICAgICB7dmFsdWU6ICcnLCBsYWJlbDogJ2Nob29zZSBvbmUnfSxcbiAgICAgICAge3ZhbHVlOiB0cnVlLCBsYWJlbDogJ3RydWUnfSwgXG4gICAgICAgIHt2YWx1ZTogZmFsc2UsIGxhYmVsOiAnZmFsc2UnfVxuICAgIF07XG5cbiAgICAkc2NvcGUudXBkYXRpbmdJbmZvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGluZm9ybWF0aW9uID0ge1xuICAgICAgICAgICAgZmlyc3ROYW1lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5maXJzdE5hbWUsIFxuICAgICAgICAgICAgbGFzdE5hbWU6ICRzY29wZS5jdXJyZW50UGVyc29uLmxhc3ROYW1lLCBcbiAgICAgICAgICAgIFNTTjogJHNjb3BlLmN1cnJlbnRQZXJzb24uU1NOLFxuICAgICAgICAgICAgRE9COiAkc2NvcGUuY3VycmVudFBlcnNvbi5ET0IsXG4gICAgICAgICAgICBnZW5kZXI6ICRzY29wZS5jdXJyZW50UGVyc29uLmdlbmRlcixcbiAgICAgICAgICAgIHJhY2U6ICRzY29wZS5jdXJyZW50UGVyc29uLnJhY2UsXG4gICAgICAgICAgICB2ZXRlcmFuU3RhdHVzOiAkc2NvcGUuY3VycmVudFBlcnNvbi52ZXRlcmFuU3RhdHVzLFxuICAgICAgICAgICAgcGhvbmU6ICRzY29wZS5jdXJyZW50UGVyc29uLnBob25lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRzY29wZS5uZWVkc1Bvc3QpIHtcbiAgICAgICAgICAgICRodHRwLnBvc3QoJ2FwaS9jbGllbnRzJywgaW5mb3JtYXRpb24pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVkUGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGh0dHAucHV0KCdhcGkvY2xpZW50cycsIGluZm9ybWF0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlZFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc2hvd0Zvcm1zID0gdHJ1ZTsgXG4gICAgICAgICQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe3Njcm9sbFRvcDogJChkb2N1bWVudCkuaGVpZ2h0KCkgfSwgMTAwMCk7XG4gICAgfTtcblxuICAgICRzY29wZS5jaGVja0RCID0gZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2NsaWVudHMnLCB7XG4gICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICBmaXJzdE5hbWU6IHBlcnNvbi5maXJzdE5hbWUsIFxuICAgICAgICAgICAgICAgIGxhc3ROYW1lOiBwZXJzb24ubGFzdE5hbWUsXG4gICAgICAgICAgICAgICAgRE9COiBwZXJzb24uRE9CXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICBpZiAocGVyc29uLmRhdGEuaWQpe1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUHV0ID0gdHJ1ZTsgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5uZWVkc1Bvc3QgPSB0cnVlOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5pc0N1cnJlbnRQZXJzb24gPSB0cnVlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKGRvY3VtZW50KS5oZWlnaHQoKSB9LCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJcIiwgZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxufSlcbiIsIi8vIGFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4vLyAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4vLyAgICAgICAgIHVybDogJy8nLFxuLy8gICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuLy8gICAgIH0pO1xuLy8gfSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2pvYnNNYXAnLCB7XG4gICAgICAgIHVybDogJy9qb2JzLW1hcCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnLi9qcy9nb29nbGVNYXBzL2dvb2dsZU1hcHMuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdqb2JzTWFwQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGpvYnM6IGZ1bmN0aW9uKGpvYkxvY3NGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gam9iTG9jc0ZhY3RvcnkuZ2V0Sm9icygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuXG5hcHAuY29udHJvbGxlciggJ2pvYnNNYXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBqb2JMb2NzRmFjdG9yeSwgam9icyl7XG4gICAgdmFyIGlkQ291bnRlciA9IDA7XG4gICAgJHNjb3BlLmluZm9XaW5kb3dBcnJheXMgPSBbXTtcblxuICAgICBhbmd1bGFyLmV4dGVuZCgkc2NvcGUsIHtcbiAgICAgICAgbWFwOiB7XG4gICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXRpdHVkZTogMzguNjI3LFxuICAgICAgICAgICAgICAgIGxvbmdpdHVkZTotOTAuMTk3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgem9vbTogMTIsXG4gICAgICAgICAgICBtYXJrZXJzOiBbXSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAobWFwLCBldmVudE5hbWUsIG1vZGVsLCBvcmlnaW5hbEV2ZW50QXJncywgJHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXkgdGhlcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ01hcmtlciB3YXMgY2xpY2tlZCcgKyBtYXApXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50TmFtZScgKyBldmVudE5hbWUpXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vZGVsJyArIG1vZGVsKVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcmlnaW5hbEV2ZW50QXJncycgKyBvcmlnaW5hbEV2ZW50QXJncylcblxuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgZSA9IG9yaWdpbmFsRXZlbnRBcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgbGF0ID0gZS5sYXRMbmcubGF0KCksbG9uID0gZS5sYXRMbmcubG5nKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciBtYXJrZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBpZDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGxhdGl0dWRlOiBsYXQsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgbG9uZ2l0dWRlOiBsb25cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIH07XG4gICAgICAgICAgICAgICAgICAgIC8vICRzY29wZS5tYXAubWFya2Vycy5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtYXJrZXJJbml0KGpvYnMsIGlkQ291bnRlciwgJHNjb3BlKTtcblxuICAgIGZ1bmN0aW9uIG1hcmtlckluaXQgKGpvYnMsIGlkQ291bnRlciwgJHNjb3BlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoZXJlcyB0aGUgJHNjb3BlJywgJHNjb3BlKTtcbiAgICAgICAgdmFyIGluZm9XaW5kb3dzQXJyYXlzID0gJHNjb3BlLmluZm9XaW5kb3dBcnJheXM7XG5cbiAgICAgICAgam9icy5mb3JFYWNoKGpvYiA9PiB7XG4gICAgICAgICAgICB2YXIgbmV3SW5mb1dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KHtcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnPGRpdiBpZD1cImNvbnRlbnRcIj4gPGI+JytcbiAgICAgICAgICAgICAgICAnTmFtZSBvZiBFbXBsb3llcjogPC9iPicgKyBqb2IuZW1wbG95ZXIgK1xuICAgICAgICAgICAgJzwvZGl2PicrJzxkaXYgPjxiPicrXG4gICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uOiA8L2I+JyArIGpvYi5kZXNjcmlwdGlvbiArXG4gICAgICAgICAgICAnPC9kaXY+JysnPGRpdiA+IDxiPicrXG4gICAgICAgICAgICAgICAgJ0luZHVzdHJ5OiA8L2I+JyArIGpvYi5pbmR1c3RyeSArXG4gICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICAgICAgLFxuICAgICAgICAgICAgICAgIG1heFdpZHRoOiAyMDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZXMgdGhlIHZhciBpbmZvV2luZG93c0FycmF5cyAnLCBpbmZvV2luZG93c0FycmF5cylcbiAgICAgICAgICAgIGluZm9XaW5kb3dzQXJyYXlzLnB1c2gobmV3SW5mb1dpbmRvdylcblxuICAgICAgICAgICAgdmFyIG1hcmtlciA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWRDb3VudGVyLFxuICAgICAgICAgICAgICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICBsYXRpdHVkZTogam9iLmxhdGl0dWRlLFxuICAgICAgICAgICAgICAgICAgICBsb25naXR1ZGU6IGpvYi5sb25naXR1ZGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1hcmtlckV2ZW50czoge1xuICAgICAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24gKG1hcmtlciwgZXZlbnROYW1lLCBtb2RlbCwgb3JpZ2luYWxFdmVudEFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXkgdGhlcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZXJlcyBpbmZvV2luZG93QXJyYXlzICwnLCBpbmZvV2luZG93c0FycmF5c1ttb2RlbC5pZEtleV0pXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmZvV2luZG93c0FycmF5c1ttb2RlbC5pZEtleV0ub3Blbihtb2RlbC5tYXAsbWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYXJrZXIgd2FzIGNsaWNrZWQnLCBtYXJrZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaGVyZXMgdGhpcyAnLCB0aGlzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50TmFtZScsIGV2ZW50TmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RlbCcsIG1vZGVsKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29yaWdpbmFsRXZlbnRBcmdzJywgb3JpZ2luYWxFdmVudEFyZ3MpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaGVyZXMgdGhlIHZhciBpbmZvV2luZG93c0FycmF5cyBjbGljayBldmVudCBpbiBtYXJrZXInLCBpbmZvV2luZG93c0FycmF5cylcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gaW5mb3dpbmRvdzogbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coe1xuICAgICAgICAgICAgICAgIC8vICAgICBjb250ZW50OiAnSGV5IHRoZXJlJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgbWF4V2lkdGg6IDIwMFxuICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJHNjb3BlLm1hcC5tYXJrZXJzLnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgIGlkQ291bnRlcisrO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgICRzY29wZS5zZWVJbmZvID0gZnVuY3Rpb24obWFya2VyKXtcbiAgICAgICAgY29uc29sZS5sb2coJ2hlcmUgaXMgdGhlIG1hcmtlciB5b3UgY2xpY2tlZCcsIG1hcmtlcilcbiAgICB9XG5cbn0pXG5cbmFwcC5mYWN0b3J5KCdqb2JMb2NzRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgam9iTG9jc0ZhY3RvcnkgPSB7fTtcblxuICAgIGpvYkxvY3NGYWN0b3J5LmdldEpvYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2pvYkxvY3MnKVxuICAgICAgICAudGhlbihyZXMgPT4gcmVzLmRhdGEpXG4gICAgfVxuXG4gICAgam9iTG9jc0ZhY3RvcnkucG9zdE5ld0pvYiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2pvYkxvY3MnKVxuICAgIH1cbiAgICByZXR1cm4gam9iTG9jc0ZhY3Rvcnk7XG59KVxuLy8gYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbi8vICAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuLy8gICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgIH07XG5cbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbi8vICAgICB9O1xuXG4vLyB9KTtcblxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5QWROM1RmRTEza3hPRkJSY2dPUWlSU3NTczFfVEZseThzJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0xvb2t1cEN0bCcsIGZ1bmN0aW9uKCRzY29wZSkge1xuXHQkc2NvcGUuZ2V0Q2xpZW50SW5mbyA9IGZ1bmN0aW9uKCl7XG5cdH07XG59KTsiLCJhcHAuZmFjdG9yeSgnUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9mYWJpYW5kZW1ic2tpLmZpbGVzLndvcmRwcmVzcy5jb20vMjAxNS8wMy91c2Vycy1mYWJpYW5wLWRvY3VtZW50cy1qb2JzLWFyY2gtc2hpaC1uZXVlci1vcmRuZXItaW5zdGFsbGF0aW9uNi5qcGc/dz02NDAmaD0zOTImY3JvcD0xJyxcbiAgICAgICAgJ2h0dHA6Ly9iZWF0dGhlOXRvNS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTIvMDgvam9iLVNlYXJjaC0xLmpwZycsXG4gICAgICAgICdodHRwOi8vaHBjdnQub3JnL3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDE0LzAyL2hhbmRzLWhvbGRpbmctaG91c2UtaW1hZ2UuanBnJyxcbiAgICBdO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdiYXNpY2luZm8nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbWlzc2luZ2Zvcm1zJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbWlzc2luZ2Zvcm1zL21pc3Npbmdmb3Jtcy5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdGb3JtIExpc3QnLCBzdGF0ZTogJ2Zvcm1saXN0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdHZXQgU3RhcnRlZCcsIHN0YXRlOiAnc3RhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0pvYnMgTWFwJywgc3RhdGU6ICdqb2JzTWFwJ31cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIl19
=======
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9QaWNzLmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJzaG93Rm9ybXMiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJtYXAiLCJjZW50ZXIiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsInpvb20iLCJ1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlciIsImNvbmZpZ3VyZSIsImtleSIsInYiLCJsaWJyYXJpZXMiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsImdldENsaWVudEluZm8iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwibGluayIsImxvZyIsImdldEJDIiwiRmlyc3RfTmFtZSIsIkxhc3RfTmFtZSIsImdldFNTQyIsImdldEZTIiwiaXRlbXMiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBQSxPQUFBQyxHQUFBLEdBQUFDLFFBQUFDLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLG1CQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLFFBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFD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QUEsU0FBQUEsVUFBQSxHQUFBO0FBQ0FYLHNCQUFBNUcsSUFBQSxHQUFBLElBQUE7QUFDQSxhQUZBOztBQUlBc0g7O0FBRUE1SSx1QkFBQUMsR0FBQSxDQUFBMEQsWUFBQVAsWUFBQSxFQUFBd0YsT0FBQTtBQUNBNUksdUJBQUFDLEdBQUEsQ0FBQTBELFlBQUFMLGFBQUEsRUFBQXVGLFVBQUE7QUFDQTdJLHVCQUFBQyxHQUFBLENBQUEwRCxZQUFBSixjQUFBLEVBQUFzRixVQUFBO0FBRUE7O0FBekNBLEtBQUE7QUE2Q0EsQ0EvQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsJ3VpR21hcGdvb2dsZS1tYXBzJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvYWJvdXQnKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShQaWNzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuICAgICAgICB1cmw6ICcvZ292ZXJubWVudGZvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGb3JtQ29udHJvbGxlcidcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ybUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuZ2V0Q2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgICAgICAkc2NvcGUuZ2V0U29jaWFsQ2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9zb2NpYWwtc2VjdXJpdHknLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3JtbGlzdCcsIHtcbiAgICAgICAgdXJsOiAnL2dvdmZvcm1zJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3JtbGlzdC9mb3JtbGlzdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Zvcm1DdHJsJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JtQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApe1xuICAgICRzY29wZS5nZXRDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlJywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgICAgICRzY29wZS5nZXRTb2NpYWxDZXJ0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2Zvcm1zL3NvY2lhbC1zZWN1cml0eScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ybXMnLCB7XG4gICAgICAgIHVybDogJy9mb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ybXMvZm9ybXMuaHRtbCcsXG4gICAgfSkgICAgXG4gICAgLnN0YXRlKCdmb3Jtcy5sb29rdXAnLCB7XG4gICAgICAgIHVybDogJy9sb29rdXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9qcy9mb3Jtcy90ZW1wbGF0ZXMvbG9va3VwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9va3VwQ3RsJ1xuICAgIH0pXG59KTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0oKSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdGFydCcsIHtcbiAgICAgICAgdXJsOiAnL3N0YXJ0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nZXRTdGFydGVkL3N0YXJ0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RhcnRDdHJsJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTdGFydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuc2hvd0Zvcm1zID0gZmFsc2U7XG5cbiAgICAkc2NvcGUub3B0aW9ucyA9IFtcbiAgICAgICAge3ZhbHVlOiAnJywgbGFiZWw6ICdjaG9vc2Ugb25lJ30sXG4gICAgICAgIHt2YWx1ZTogdHJ1ZSwgbGFiZWw6ICd0cnVlJ30sXG4gICAgICAgIHt2YWx1ZTogZmFsc2UsIGxhYmVsOiAnZmFsc2UnfVxuICAgIF07XG5cbiAgICAkc2NvcGUudXBkYXRpbmdJbmZvID0gZnVuY3Rpb24oKXtcblxuICAgICAgICB2YXIgaW5mb3JtYXRpb24gPSB7XG4gICAgICAgICAgICBmaXJzdE5hbWU6ICRzY29wZS5jdXJyZW50UGVyc29uLmZpcnN0TmFtZSxcbiAgICAgICAgICAgIGxhc3ROYW1lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5sYXN0TmFtZSxcbiAgICAgICAgICAgIFNTTjogJHNjb3BlLmN1cnJlbnRQZXJzb24uU1NOLFxuICAgICAgICAgICAgRE9COiAkc2NvcGUuY3VycmVudFBlcnNvbi5ET0IsXG4gICAgICAgICAgICBnZW5kZXI6ICRzY29wZS5jdXJyZW50UGVyc29uLmdlbmRlcixcbiAgICAgICAgICAgIHJhY2U6ICRzY29wZS5jdXJyZW50UGVyc29uLnJhY2UsXG4gICAgICAgICAgICB2ZXRlcmFuU3RhdHVzOiAkc2NvcGUuY3VycmVudFBlcnNvbi52ZXRlcmFuU3RhdHVzLFxuICAgICAgICAgICAgcGhvbmU6ICRzY29wZS5jdXJyZW50UGVyc29uLnBob25lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRzY29wZS5uZWVkc1Bvc3QpIHtcbiAgICAgICAgICAgICRodHRwLnBvc3QoJ2FwaS9jbGllbnRzJywgaW5mb3JtYXRpb24pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwZXJzb24pe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVkUGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGh0dHAucHV0KCdhcGkvY2xpZW50cycsIGluZm9ybWF0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlZFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgICQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe3Njcm9sbFRvcDogJChkb2N1bWVudCkuaGVpZ2h0KCkgfSwgMTAwMCk7XG4gICAgfTtcblxuICAgICRzY29wZS5jaGVja0RCID0gZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL2NsaWVudHMnLCB7XG4gICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICBmaXJzdE5hbWU6IHBlcnNvbi5maXJzdE5hbWUsXG4gICAgICAgICAgICAgICAgbGFzdE5hbWU6IHBlcnNvbi5sYXN0TmFtZSxcbiAgICAgICAgICAgICAgICBET0I6IHBlcnNvbi5ET0JcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgIGlmIChwZXJzb24uZGF0YS5pZCl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmVlZHNQdXQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmVlZHNQb3N0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5pc0N1cnJlbnRQZXJzb24gPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLnNob3dGb3JtcyA9IHRydWU7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKCdodG1sLGJvZHknKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoZG9jdW1lbnQpLmhlaWdodCgpIH0sIDEwMDApO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVSUlwiLCBlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdqb2JzTWFwJywge1xuICAgICAgICB1cmw6ICcvam9icy1tYXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy4vanMvZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnam9ic01hcEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCAnam9ic01hcEN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuICAgICRzY29wZS5tYXAgPSB7IGNlbnRlcjogeyBsYXRpdHVkZTogMzguNjI3LCBsb25naXR1ZGU6IC05MC4xOTcgfSwgem9vbTogMTIgfTtcblxufSlcbi8vIGFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4vLyAgICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbi8vICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuLy8gICAgICAgICB9KTtcbi8vICAgICB9O1xuXG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4vLyAgICAgfTtcblxuLy8gfSk7XG5cblxuYXBwLmNvbmZpZyhmdW5jdGlvbih1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlcikge1xuICAgIHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyLmNvbmZpZ3VyZSh7XG4gICAgICAgIGtleTogJ0FJemFTeUFkTjNUZkUxM2t4T0ZCUmNnT1FpUlNzU3MxX1RGbHk4cycsXG4gICAgICAgIHY6ICczLjIwJywgLy9kZWZhdWx0cyB0byBsYXRlc3QgMy5YIGFueWhvd1xuICAgICAgICBsaWJyYXJpZXM6ICd3ZWF0aGVyLGdlb21ldHJ5LHZpc3VhbGl6YXRpb24nXG4gICAgfSk7XG59KVxuIiwiLy8gYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbi8vICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbi8vICAgICAgICAgdXJsOiAnLycsXG4vLyAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4vLyAgICAgfSk7XG4vLyB9KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9mYWJpYW5kZW1ic2tpLmZpbGVzLndvcmRwcmVzcy5jb20vMjAxNS8wMy91c2Vycy1mYWJpYW5wLWRvY3VtZW50cy1qb2JzLWFyY2gtc2hpaC1uZXVlci1vcmRuZXItaW5zdGFsbGF0aW9uNi5qcGc/dz02NDAmaD0zOTImY3JvcD0xJyxcbiAgICAgICAgJ2h0dHA6Ly9iZWF0dGhlOXRvNS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTIvMDgvam9iLVNlYXJjaC0xLmpwZycsXG4gICAgICAgICdodHRwOi8vaHBjdnQub3JnL3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDE0LzAyL2hhbmRzLWhvbGRpbmctaG91c2UtaW1hZ2UuanBnJyxcbiAgICBdO1xufSk7XG4iLCJhcHAuY29udHJvbGxlcignTG9va3VwQ3RsJywgZnVuY3Rpb24oJHNjb3BlKSB7XG5cdCRzY29wZS5nZXRDbGllbnRJbmZvID0gZnVuY3Rpb24oKXtcblx0fTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2Jhc2ljaW5mbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Jhc2ljSW5mby9iYXNpY2luZm8uaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdtaXNzaW5nZm9ybXMnLCBmdW5jdGlvbiAoJGh0dHApIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZTogZmFsc2UsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbWlzc2luZ2Zvcm1zL21pc3Npbmdmb3Jtcy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlKTtcbiAgICAgICAgICBzY29wZS5nZXRCQyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8nKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGAvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlL2NvbXBsZXRlP2ZpcnN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRmlyc3RfTmFtZX0mbGFzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkxhc3RfTmFtZX0mRE9CPSR7c2NvcGUuY3VycmVudFBlcnNvbi5ET0J9YClcblxuICAgICAgICAgIH1cbiAgICAgICAgICBzY29wZS5nZXRTU0MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2hlbGxvJyk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihgL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZS9jb21wbGV0ZT9maXJzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkZpcnN0X05hbWV9Jmxhc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5MYXN0X05hbWV9JkRPQj0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRE9CfWApO1xuXG5cbiAgICAgICAgICB9XG4gICAgICAgICAgc2NvcGUuZ2V0RlMgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oYC9hcGkvZm9ybXMvZm9vZC1zdGFtcHMvY29tcGxldGU/Zmlyc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5GaXJzdF9OYW1lfSZsYXN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uTGFzdF9OYW1lfSZET0I9JHtzY29wZS5jdXJyZW50UGVyc29uLkRPQn1gKTtcblxuICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnRm9ybSBMaXN0Jywgc3RhdGU6ICdmb3JtbGlzdCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnR2V0IFN0YXJ0ZWQnLCBzdGF0ZTogJ3N0YXJ0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdKb2JzIE1hcCcsIHN0YXRlOiAnam9ic01hcCd9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiJdfQ==
>>>>>>> master
