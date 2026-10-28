/** components.MCPStateClass: MCP scope/agent state → .mcp-state modifier. */
export function mcpStateClass(state: string): string {
	switch (state) {
		case 'live':
			return 'is-live';
		case 'off':
			return 'is-off';
		default:
			return 'is-ready';
	}
}
