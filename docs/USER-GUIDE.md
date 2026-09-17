# User guide

## 1. Prepare the tournament

Open `/admin` and select **Tournament & rules**. Choose English or Spanish, then define the identity, sport, discipline-specific terms, currency, venue, and event days. Logos and posters accept a path inside `public`, such as `/logo.png`, or an HTTPS URL.

Choose the scoring method:

- **Winner and free-form score** works for any sport.
- **Set-based result** calculates the winner from the recorded sets.

The current engine creates single-elimination brackets with 2, 4, 8, 16, or 32 slots.

## 2. Add participants and schedules

Under **Participants**, enter names in opening-match order. An empty slot can become a bye before the bracket starts.

Under **Matches**, adjust date, time, duration, and playing area. Automatic rescheduling respects event days, area availability, and round dependencies.

## 3. Run the event

Use **Scheduled**, **Called**, and **Live** so the public site reflects the current state. One playing area cannot have two live matches. When a match ends, record the winner, score, or walkover.

Use `/pantalla` for a TV or projector. Saved organizer changes appear on the public site during its next refresh.

## 4. Point of sale, inventory, and food

Create products with cost, price, low-stock threshold, and availability. Each recorded sale reduces inventory and separates cash from transfers. Voids require a reason and can return items to inventory.

The report shows revenue, cost, gross margin, units, and sales by product, operator, and day. Reports and inventory movements can be exported as CSV.

## 5. Users and permissions

Administrators can create an individual account for each role. Grant only the required tournament, product, sales, report, or user modules. Do not share the main administrator account.

## 6. After the tournament

Export the public tournament information and create a consistent SQLite backup. Store it outside the server before updating or removing infrastructure. See [Deployment](DEPLOYMENT.md) for commands.
