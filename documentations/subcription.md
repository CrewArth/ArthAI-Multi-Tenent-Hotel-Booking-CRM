Implement a subscription-based system in the project with three plans: **Basic, Pro, and Enterprise**.

The subscription plan should control the maximum number of hotels, rooms, and admins that can be created within the system.

### Basic Plan

* Maximum **1 Hotel**
* Maximum **10 Rooms per Hotel**
* Maximum **1 Admin per Hotel**

### Pro Plan

* Maximum **3 Hotels**
* Maximum **20 Rooms per Hotel**
* Maximum **3 Admins per Hotel**

### Enterprise Plan

* Maximum **5 Hotels**
* Maximum **50 Rooms per Hotel**
* Maximum **5 Admins per Hotel**

Implement the subscription logic so that the limits are enforced based on the currently active plan. A user/admin should not be able to create additional hotels, rooms, or admins once the respective subscription limit has been reached. The system should dynamically determine the applicable limits from the user's current subscription plan rather than hardcoding separate logic throughout the project.
