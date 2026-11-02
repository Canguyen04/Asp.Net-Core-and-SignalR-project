using Logistics.Api.Services;
using Xunit;
namespace Logistics.Tests;
public class LogisticsTests
{
    [Theory]
    [InlineData("pending","cancelled","customer",2,2,null,true)]
    [InlineData("pending","cancelled","driver_express",3,2,3,false)]
    [InlineData("accepted","arrived_pickup","driver_express",3,2,3,true)]
    [InlineData("accepted","completed","driver_express",3,2,3,false)]
    [InlineData("arrived_pickup","delivering","driver_express",3,2,3,true)]
    [InlineData("delivering","completed","driver_express",3,2,3,true)]
    [InlineData("completed","accepted","driver_express",3,2,3,false)]
    public void State_machine_enforces_roles_and_order(string a,string b,string role,int actor,int customer,int? driver,bool expected)
        => Assert.Equal(expected,OrderStateMachine.CanTransition(a,b,role,actor,customer,driver));

    [Fact]
    public void Haversine_returns_zero_for_same_point() => Assert.Equal(0,LogisticsServices.Haversine(10.7626,106.6601,10.7626,106.6601),6);
    [Fact]
    public void Haversine_measures_a_finite_positive_distance() {
        var distance=LogisticsServices.Haversine(10.7626,106.6601,10.7945,106.7218);
        Assert.InRange(distance,5,10);
    }
}
