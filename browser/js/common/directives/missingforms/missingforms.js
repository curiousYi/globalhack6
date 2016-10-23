app.directive('missingforms', function ($http) {
    return {
        restrict: 'E',
        scope: false,
        templateUrl: 'js/common/directives/missingforms/missingforms.html',
        link: function(scope){
          console.log(scope);
          scope.getBC = function(){
            console.log('hello');
            $http.get(`/api/forms/birth-certificate/complete?firstname=${scope.currentPerson.firstName}&lastname=${scope.currentPerson.lastName}&DOB=${scope.currentPerson.DOB}`)

          }
          scope.getSSC = function(){
            console.log('hello');
            $http.get(`/api/forms/birth-certificate/complete?firstname=${scope.currentPerson.firstName}&lastname=${scope.currentPerson.lastName}&DOB=${scope.currentPerson.DOB}`)

          }

        }

    };
});
