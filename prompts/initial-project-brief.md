I need you to build out a website for my company called Stable Chaos that is going to act as our fundraising pitch. The goal of this site is to educate investors and other funds into our mission in a compelling and interactive way that also feels really impressively capable. 

## Technical Overview:
This website will need to be password protected and hosted at a cheap spot. I use cloudflare pages for a lot of my site hosting which I like but I don't know if we can safely host something that has to be password protected there. I'd also like to be able to send out unique links to the site so I can track which investors have opened it and what of the content they viewed. I'd also like to track maybe the devices or locations per link so I can see if someone is forwarding their link on.  The site will also need to host a fair amount of small videos. We could host these anywhere that is a safe solution while still keeping them private. 

## Site structure
My objective is to tell our story at 6 layers. Those layers will be:
   1) Who We Are - establish investor trust in us.
   2) What We Believe - establish investor trust in the philosophical underpinning of what we are doing.
   3) Critical Sectors - establish investor understanding in the spaces we will work in categorically.
   4) Services - establish investor understanding of our service based solutions to the problems in the sectors we are working in.
   5) Products - establish investor understanding of our product based solutions derived from the insights and access of our service businesses. 
   6) Foundational Background - provide foundational 3rd party examples of information that supports our claims and beliefs throughout. 

How I imagine the core layout of the site is that we need a collapsible left side nav that will be our index for entire site navigation. Then a core central part of the site that is our content area where we explore the content we are focusing on but can also see peripheral / related content (I think of this entire site as kind of navigating like layered node graphs where we can jump layers zooming out (up) or in (down) but then within each layer we will have lots of nodes which will have various relationships within their level and the central content can be focused on a single node and then have it's focus shifted to another node interactive). Then we need a collapsible right side tray that will host our "Supporting Context" for whatever is focused. These could be article, videos, links, etc. that people can explore. 

When a "node" is focused, I'd like for it to take up the majority of the core content area but then we still need to see some of the other nodes around the edges as jumping off points as well as be able to navigate back up a layer

To move between layers, I think we should have an up arrow at the top of the core content that says "Explore <prior-layer-title>" and a down arrow at the bottom of the core content that says "Explore <next-layer-title>"

For layers 3 (Critical Sectors), 4 (Services), & 5 (Products) I would also like to introduce a secondary emphasis control at the top of the core content that has 4 segmented controller style options to bring extra emphasis on the nodes related to the selected option and allow those not to sink back. The 4 options here will be "All", "SynBio", "Security", "Systems". Which are our 3 critical sectors plus a default "All". This shouldn't hide the non-associated nodes but it should background them heavily and bring the others foregrounded for focus so a presenter could control a viewers focus. 

Our core content area needs to support a different "focus" style / layout per layer we are viewing. 

We need a welcome state for the core content that is our logo with our tagline "Engineering Solutions From Frontier Insights". There should be a subtle spot to trigger a video to appear in the core content area introducing the company. 

We also want global control on the site that sits somewhere persistent that displays our node pages as "Compressed" or "Expanded". It will default into the "Compressed" view which will high the secondary nodes in each layer. If someone switches it to "Expanded" it will show all the secondary nodes. This lets a presenter choose how deep they want to go into the weeds if they are using this to present to someone. 

This site should be able to be used / viewed kind of like a "Prezi" style presentation where its very easy for someone to interactively navigate around the experience. 

For all the nodes and their content, I have built them out as JSON objects in arrays in the following files. I would like our views to pull their content from these json files so that I can easily update content in a singular place. The shapes of each JSON object are consistent within each file but vary a bit file to file. Where there is blank content in the JSON file, I want you to insert lorem ipsum as placeholder text in the site. I have intentionally left a lot of the copy blank on the nodes for the first pass so we can design the UI that looks good size and structure wise with the lorem ipsum and then I can provide the correct length of real content. Each node item also has a context_items array that will hold the items for the right side context tray. These are empty on the first pass of this build out. After we get the core styles correct and I add all the copy, I will add context items in a consistent shape and we can do that in a second design pass. For non-text items in the nodes that I've left blanks, build out some default placeholders (things like pictures, icons, video links, etc.). The UI should handle all empty states gracefully with placeholder content during the development phase and then once we go live we will make UI elements visibility dependent on having content or not. 

The Left menu nav needs to be a quick jump navigable list of all our layers broken up by layer and then with 2 tiers of links based on primary and secondary nodes within a layer and a global search bar at the top so a user can quickly jump to anything in the site based on searching the name. 


## Layer Style Descriptions
   1) Who We Are
      Nodes File: prompts/who-nodes.json
      Layer Layout: This needs to support a node / card type layout where we have 2 founders at the top, 4 presidents underneath of the portfolio companies. 
      Node Style: Nodes can be card style with a photo of the person, their name and a job title
      Node Focus / core content: This needs to support a head shot photo of the person, their name, a title, a company name, a short bio blurb and then bullet points for resume items. 
   2) What We Believe
      Nodes File: prompts/beliefs-nodes.json
      Layer Layout: This layer will have nodes of 2 types (Threats & Advantages) I'd like the threats largely aggregated on the left and the Advantages largely aggregated on the right. 
      Node Style: These can hold a title and we can try to find a representative icon for each. They should also be colored or have a label to identify them with which category they are a part of. 
      Node Focus / core content: Each focus view will need a title, a descriptor blurb and the a section to display bullet points about it as well as an embedded video that can be played in an expanded view that takes up the core focus area.
   3) Critical Sectors
      Nodes File: prompts/sectors-nodes.json
      Layer Layout: This section will have primary and secondary nodes. It will have 3 primary nodes and secondary nodes that will connect to one or more of the primary nodes. The primary nodes should sit above the secondary nodes.
      Node Style: Primary nodes can be larger (maybe wider but not try to take up more vertical height so we can fit the secondary nodes) and will just have a single title but should have a color unique to the node (only 3) The secondary nodes can also just have a title and should position themselves close to the primary nodes they are related to with relationship connecting lines. the secondary nodes should maybe have a border color or shadow color that matches the primary node it's owned by (If it's associated with 2 maybe we do some color combo where it has a shadow that is from on and a border / background opacity from the other. Secondary nodes will not be associated with more than 2 primary nodes). The primary nodes will be "Sectors" and the secondary nodes will be "Domains" within those sectors.
      Node Focus / core content: Each focus view will need a title, a descriptor blurb and the a section to display bullet points about it as well as an embedded video that can be played in an expanded view that takes up the core focus area.
   4) Services
      Nodes File: prompts/service-nodes.json
      Layer Layout: We will have primary and secondary nodes here where primary are our actual service companies and the secondary are their offerings. Primary should go above and secondary below with the secondary connecting to their primary via connector lines
      Node Style: Primary nodes should have a company logo, name and URL. Secondary nodes will have just a offering title. The primary and secondary nodes need a label of which sector they are associated with and a connecting line to the service company. 
      Node Focus / core content: Each focus view will need a title, a descriptor blurb and the a section to display bullet points about it as well as an embedded video that can be played in an expanded view that takes up the core focus area.
   5) Products
      Nodes File: prompts/product-nodes.json
      Layer Layout: There will only be one style of node.
      Node Style: The nodes need labels identifying which sector they are associated to. We will also want to identify some nodes as different visual states for products we've already built vs ones we are going to build. This will be identified with a "stage": "active" vs "slatted". These will also have a product category which we probably want to show some iconography based on. 
      Node Focus / core content: Each focus view will need a title, a descriptor blurb and the a section to display bullet points about it as well as an embedded video that can be played in an expanded view that takes up the core focus area. I think we should also have something like product photos gallery on these and maybe a cool background photo of the environment the product is used in.
   6) Supporting Context (WE WILL DO THIS SECTION IN A SECONDARY PASS)
      Nodes File: 
      Layer Layout: 
      Node Style: 
      Node Focus / core content: 


## Overall Site Messaging & Styles
Stable Chaos is a holding company thats purpose is "Engineering Solutions From Frontier Insights". You can find the code for our marketing site here (/Users/hunterbrowning/ws/stable-chaos-marketing). The copy is a little out of date in some areas but the styling and colors and design treatments should carry over to this pitch site. This whole site needs to feel really rich and smooth to navigate. 