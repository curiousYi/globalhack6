app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function($scope, $http){

    $scope.checkDB = function(person){
        //check db for name
        $http.get('/api/clients/indiv', {
            params: {
                firstName: person.firstName, 
                lastName: person.lastName,
                DOB: person.DOB
            }
        })
        .then(function(person){
            if (person) {

            } else {
                
            }
        })
        //if person is in db, have them double check their existing info
        //if person is NOT in db, have them enter basic info

        // proceed to instructions for obtaining any missing documentation
    }
})
