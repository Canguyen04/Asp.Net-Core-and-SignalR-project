namespace Logistics.Api.Services;
public static class OrderStateMachine
{
    // A single transition table used by the API and unit tests.
    public static bool CanTransition(string current,string next,string role,int actorId,int customerId,int? driverId) =>
        (current,next) switch {
            ("pending","cancelled") => role=="customer" && actorId==customerId,
            ("accepted","arrived_pickup") => role.StartsWith("driver") && actorId==driverId,
            ("arrived_pickup","delivering") => role.StartsWith("driver") && actorId==driverId,
            ("delivering","completed") => role.StartsWith("driver") && actorId==driverId,
            _ => false
        };
}
