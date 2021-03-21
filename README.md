# tank-trouble
An online multiplayer clone of the wonderful game tank trouble, using JavaScript and Python using only Flask and WebSocket as external libraries.
This is mostly a project for me to learn more JS and WebSocket not so much a serious attemt to create a playable game.  Perhaps one day I'll have
another crack at this.  For anyone else trying this, here is some advice:
- WebSocket is basically unusable for real time games
- Client clocks are not guarunteed to be at all consistent - so time sync strategy is required
- If I were to actually try to release this, it would be much more convenient to use peer-to-peer WebRTC and serve the page as a static site.  That way, there are no expensive server costs and no issues around DDoSing and scalability, and WebRTC is just much better than WebSocket for real time communication
- If I were to rewrite this, I'd probably write the vast majority of the code in Rust and compile to WASM, since Rust is so much performant and maintainable than pure JS.  But this is mostly personal opinion; it's largely up to you.

I have shelved this project because my attention has been more focussed on other projects (for example [Wheatley](https://github.com/kneasle/wheatley), [Sapling](https://github.com/kneasle/sapling) and [Bellmetal](https://github.com/kneasle/bellmetal)).  Development is also extremely hard because WebSocket is **not** designed with real time games in mind, and so the game is likely to be extremely laggy and hard to play.
