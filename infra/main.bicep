param location string = resourceGroup().location
param appServicePlanName string 
param webAppName string 


resource appServicePlan 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'F1'
    capacity: 1
  }
  kind: 'linux'
}

resource webApp 'Microsoft.Web/sites@2025-03-01' = {
  name: webAppName
  location: location
  
  properties: {
    serverFarmId: appServicePlan.id
  }
}
