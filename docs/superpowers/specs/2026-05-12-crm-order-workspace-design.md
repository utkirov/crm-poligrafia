# CRM Order Workspace Redesign

## Goal

Redesign the CRM into a modern hybrid product that feels visually strong and current while making daily manager work faster.

The redesign must solve two current problems at the same time:
- the UI looks dated and fragmented;
- the UX breaks manager focus by forcing frequent jumps between orders, clients, payments, tickets, and separate pages.

The primary user for the redesign is `manager`.

The primary scenario is `orders`.

The primary UX problem is `context switching`.

## Product Direction

The approved direction is:
- full CRM redesign, not a single-screen refresh;
- `Hybrid` visual character;
- manager-first experience;
- desktop-first layout with real mobile support;
- bold IA changes are allowed;
- `Order Workspace` becomes the core interaction model.

This means the project should not optimize around isolated page polish. It should optimize around a faster operating flow for working through orders all day.

## Design Principles

The redesign must follow these principles:
- `One active order, one working context`: the manager should understand and act on one order without opening multiple disconnected pages.
- `Find -> open -> act -> continue`: opening an order should immediately expose the next useful action.
- `Context stays visible`: related client, payment, ticket, and timeline information should stay near the order instead of living behind route changes.
- `Visual hierarchy over visual noise`: the UI should feel premium and modern, but never decorative at the cost of scan speed.
- `Density with clarity`: the interface should stay information-rich enough for CRM work while using spacing and grouping to reduce stress.

## Information Architecture

### Core shift

The product should move from a mostly page-based modular CRM into a workspace-centered CRM.

Today the manager workflow is spread across:
- dashboard / kanban;
- order detail;
- order creation;
- client detail;
- payments;
- ticket detail.

After the redesign, the product center should be `Orders Workspace`.

### New IA model

`Orders Workspace`
- main daily operating surface for managers;
- combines order list, order focus area, and contextual side data.

`Clients`
- remains as a dedicated module for client base management, deep history, and non-order-centric work.

`Finance`
- remains separate for finance-heavy workflows and role-specific control.

`Services`
- remains separate as a reference-management module.

`Analytics`
- remains separate and director-focused.

This preserves domain separation where it is useful, but removes unnecessary fragmentation from the manager's main order flow.

## Main Screen: Orders Workspace

The workspace should be a 3-zone layout on desktop.

### Left zone: order list rail

Purpose:
- help the manager find and switch between orders quickly.

Content:
- global order search;
- quick filters;
- saved views;
- tabs or toggles such as `New`, `In Progress`, `Overdue`, `Today`, `Ready`, `Mine`;
- compact order cards with:
  - order number;
  - title;
  - client name;
  - status;
  - deadline / overdue signal;
  - amount;
  - optional urgency marker.

Behavior:
- selecting an order should update the center and right zones without a full-page mental reset;
- switching orders should feel immediate and lightweight;
- filters and views should support fast operational triage.

### Center zone: active order canvas

Purpose:
- keep the full working understanding of the active order in one main focus area.

Content:
- prominent order header;
- status progress / stage controls;
- deadline and SLA emphasis;
- services / line items;
- order description and notes;
- timeline / activity history;
- main order actions.

Behavior:
- this area should be optimized for reading, editing, and advancing an order;
- it should feel like the main scene of the app;
- the manager should not need to leave this area to understand what is happening with the order.

### Right zone: context rail

Purpose:
- expose all related but secondary entities without breaking focus.

Content:
- client summary;
- cashback / balance block;
- payments summary and quick payment actions;
- production ticket summary and quick ticket actions;
- responsible users;
- repeat order;
- print / export;
- quick edit actions.

Behavior:
- actions here should open inline panels, drawers, or compact modals;
- the manager should not lose the active order context while using these tools.

## Orders Workflow

### Main operating flow

The core flow should become:
1. Manager opens `Orders Workspace`.
2. Manager scans or filters the order list.
3. Manager selects an order.
4. Manager acts from the center canvas or right context rail.
5. Manager returns to the list mentally, not structurally, and continues with the next order.

The important point is that the workflow should feel continuous, not route-driven.

### Status actions

Status changes must become direct, legible, and low-friction.

The UI should:
- show current stage clearly;
- allow the next logical stage action prominently;
- allow safe reverse / cancel flows with confirmation where needed;
- give immediate visual feedback after a status change.

### Client-related actions

Client information should remain close to the active order.

The manager should be able to:
- inspect client contact data;
- see cashback information;
- open deeper client history when needed;
- contact or reference the client without a full workflow break.

### Payments-related actions

Payment context should stay visible near the order.

The manager should be able to:
- see payable amount, paid amount, and remaining amount quickly;
- add or manage payments through compact interaction surfaces;
- avoid navigating into a separate detached page for routine payment steps where possible.

### Ticket-related actions

Production ticket context should also stay near the order.

The manager should be able to:
- see whether a ticket exists;
- create a ticket inline if it does not;
- inspect current ticket status and assignees;
- jump to a deeper ticket workflow only when necessary.

## Order Creation

The existing step logic can stay conceptually multi-step, but the experience should feel faster and more connected to the workspace.

### Creation model

The preferred model is a `focused creation mode` within the same product language as the workspace, not a disconnected-feeling page.

### Creation requirements

Client step:
- search existing client inline;
- create new client inline without heavy context loss.

Order step:
- add services and line items with clearer structure;
- reduce visual heaviness of the current step experience;
- keep totals understandable as the user edits.

Payment step:
- make cashback, payable amount, and planned payments visible together;
- reduce hidden arithmetic;
- keep the financial summary readable during entry.

Persistent summary:
- a live summary should remain visible on desktop during creation;
- the user should not need to remember what was entered in previous steps.

## Visual System

### Visual tone

The approved tone is `modern hybrid`.

That means:
- premium, modern, and product-grade;
- clearly more intentional than the current UI;
- still operational and practical for CRM use.

### Palette direction

Base:
- light premium workspace surfaces for the main canvas;
- deep slate / ink surfaces for navigation and utility areas.

Accent:
- blue to teal / cyan accent family;
- restrained use of warm warning colors for urgency, deadlines, and destructive states.

Avoid:
- flat generic SaaS whiteness;
- noisy glassmorphism;
- heavy purple bias;
- dark-only visual strategy.

### Typography and spacing

The redesign should use:
- stronger type hierarchy for page title, order title, section labels, and metadata;
- cleaner spacing rhythm between blocks;
- more editorial grouping, especially in the center order canvas.

The UI should look calmer even when it contains more information.

### Surfaces and shapes

The visual language should favor:
- distinct panels and rails;
- clean card boundaries;
- medium-large radii where they support modern feel;
- shadows used for depth, not decoration.

The center order canvas should feel visually dominant over peripheral areas.

## Motion

Motion should be functional, not ornamental.

Include:
- smooth active-order transitions;
- subtle drawer / inline panel entrances;
- light feedback for state changes;
- purposeful skeleton and loading states.

Avoid:
- flashy continuous animation;
- sluggish transitions that slow down operational work.

## Responsive Behavior

### Desktop

Desktop is the primary experience.

The intended model is:
- persistent multi-zone workspace;
- fast order switching;
- high information density with clear grouping.

### Mobile

Mobile should keep the same conceptual model, but not the same layout.

Recommended mobile layering:
1. order list layer;
2. active order layer;
3. contextual bottom sheets / drawers for client, payments, and ticket.

Mobile must support the core manager actions:
- open order;
- inspect key data;
- change status;
- check client;
- check payment state;
- perform a small number of quick actions.

Horizontal-scroll-heavy desktop compression is not acceptable on mobile.

## Navigation Model

The redesign should reduce the dominance of traditional page switching for manager order work.

Expected navigation behavior:
- the manager enters orders through the workspace;
- selection inside the workspace updates context;
- deeper pages remain available for edge cases, historical review, or role-specific depth;
- route changes should support linking and refresh safety, but the mental model should remain workspace-first.

## Design System Requirements

Implementation must be backed by a real internal design system layer.

Required foundations:
- color tokens;
- spacing tokens;
- radius tokens;
- elevation / shadow tokens;
- shared panel, card, form, list, badge, filter, drawer, and modal patterns;
- consistent empty / loading / error / success states.

The redesign must not be implemented as isolated one-off screens with separate visual rules.

## Scope

Included in this redesign direction:
- global UI modernization;
- new manager-first orders information architecture;
- workspace-based order handling;
- redesigned order creation flow;
- rethought client / payment / ticket proximity to order work;
- desktop and mobile behavior rules;
- design-system-level consistency requirements.

Not included in this design decision by default:
- unrelated business-rule changes;
- finance-domain process redesign for financier role;
- analytics feature expansion;
- database model changes not required by the UX direction itself.

## Rollout Guidance

Because the IA change is significant, implementation should be phased.

Recommended implementation sequence:
1. establish tokens and shared layout primitives;
2. redesign shell / sidebar / global navigation language;
3. build `Orders Workspace` desktop-first;
4. adapt order detail behavior into workspace panels;
5. redesign order creation to match the workspace mental model;
6. refine mobile layers for the key manager actions;
7. align adjacent modules visually so the product feels consistent.

This sequence keeps the redesign coherent while reducing the risk of a half-old, half-new product experience.

## Testing And Validation

The redesign should be validated against these outcomes:
- managers can move through orders with fewer route changes;
- the active order is understandable without opening multiple screens;
- payment, client, and ticket context are discoverable faster;
- order creation feels lighter and clearer;
- desktop use feels premium and efficient;
- mobile use remains usable for the core manager flow.

Validation should include:
- browser smoke for order switching, quick actions, and creation;
- responsive checks for mobile layering;
- regression checks for status, payment, and ticket workflows.

## Final Decision

The CRM will be redesigned around a `manager-first Order Workspace`.

The visual direction is `modern hybrid`.

The product should keep separate modules where they add value, but the manager's main order workflow should no longer depend on bouncing between disconnected pages.

The success condition for the redesign is not only that the CRM looks modern. It is that the manager can process orders faster with less context switching while the product feels significantly more premium and intentional than the current interface.
