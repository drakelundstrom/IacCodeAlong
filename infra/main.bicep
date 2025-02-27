param appServicePlanName string
param location string = resourceGroup().location
param appName string



resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: appServicePlanName 
  location: location
  sku: {
    name: 'F1'
  }
  kind: 'linux'
}

resource appService 'Microsoft.Web/sites@2024-04-01' = {
  name: appName 
  location: location
  properties: {
    serverFarmId: appServicePlan.id
  }
}
