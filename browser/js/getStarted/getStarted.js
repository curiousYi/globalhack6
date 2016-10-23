app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function($scope, $http){

    $scope.options = [
        {value: '', lable: 'choose one'},
        {value: true, label: 'true'}, 
        {value: false, label: 'false'}
    ];

    $scope.updatingInfo = function(){
        var information = {
            firstName: $scope.currentPerson.firstName, 
            lastName: $scope.currentPerson.lastName, 
            SSN: $scope.currentPerson.SSN,
            DOB: $scope.currentPerson.DOB,
            gender: $scope.currentPerson.gender,
            race: $scope.currentPerson.race,
            veteranStatus: $scope.currentPerson.veteranStatus,
            phone: $scope.currentPerson.phone
        }
        if ($scope.needsPost) {
            $http.post('api/clients', information)
            .then(function(person){
                console.log('newly added person', person)
            })
        } else {
            $http.put('api/clients', information)
            .then(function(person){
                console.log('newly updated person', person)
            })
        }

    };

    $scope.checkDB = function(person){
        //check db for name
        $http.get('/api/clients', {
            params: {
                firstName: person.firstName, 
                lastName: person.lastName,
                DOB: person.DOB
            }
        })
        .then(function(person){
        //if person is in db, have them double check their existing info
            if (person){
                $scope.currentPerson = person.data;
                $scope.isCurrentPerson = true;
                $scope.needsPost = false; 
            } else {
                $scope.needsPost = true; 
            }
        })
        .catch(function(error){
            console.error("ERR", error)
        })

        //if person is NOT in db, have them enter basic info
        // proceed to instructions for obtaining any missing documentation
    }
})
