app.directive('missingforms', function ($http) {
    return {
        restrict: 'E',
        scope: false,
        templateUrl: 'js/common/directives/missingforms/missingforms.html',
        link: function(scope){
          console.log(scope);
          scope.getBC = function(){
            console.log('hello');
            window.open(`/api/forms/birth-certificate/complete?firstname=${scope.currentPerson.First_Name}&lastname=${scope.currentPerson.Last_Name}&DOB=${scope.currentPerson.DOB}`)

          }
          scope.getSSC = function(){
            console.log('hello');
            window.open(`/api/forms/birth-certificate/complete?firstname=${scope.currentPerson.First_Name}&lastname=${scope.currentPerson.Last_Name}&DOB=${scope.currentPerson.DOB}`);
            // $http.get(`/api/forms/birth-certificate/complete?firstname=${scope.currentPerson.First_Name}&lastname=${scope.currentPerson.Last_Name}&DOB=${scope.currentPerson.DOB}`)

          }

        }

    };
});
