import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { MappedSuggestion, Suggestion } from '@assignment-ai/shared';
import { createRoot } from 'react-dom/client';
import { InlineSuggestionWidget } from '@/components/InlineSuggestionWidget';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineSuggestions: {
      setSuggestions: (suggestions: MappedSuggestion[], selectionStart: number) => ReturnType;
      acceptSuggestion: (id: string) => ReturnType;
      rejectSuggestion: (id: string) => ReturnType;
    };
  }
}

export interface SuggestionsState {
  suggestions: MappedSuggestion[];
  selectionStart: number; // base offset for mapping
}

const suggestionsPluginKey = new PluginKey<SuggestionsState>('inlineSuggestions');

export const InlineSuggestions = Extension.create({
  name: 'inlineSuggestions',

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin<SuggestionsState>({
        key: suggestionsPluginKey,
        
        state: {
          init: () => ({ suggestions: [], selectionStart: 0 }),
          
          apply(tr, state) {
            // Handle accept/reject from widget clicks
            const acceptId = tr.getMeta('acceptSuggestion');
            if (acceptId) {
              const suggestion = state.suggestions.find(s => s.id === acceptId);
              if (suggestion) {
                // Apply the suggestion
                tr.replaceWith(suggestion.absoluteFrom, suggestion.absoluteTo, 
                  tr.doc.type.schema.text(suggestion.replacement));
                // Remove from state
                return { 
                  ...state, 
                  suggestions: state.suggestions.filter(s => s.id !== acceptId) 
                };
              }
            }
            
            const rejectId = tr.getMeta('rejectSuggestion');
            if (rejectId) {
              // Just remove from state
              return { 
                ...state, 
                suggestions: state.suggestions.filter(s => s.id !== rejectId) 
              };
            }
            
            // Update state if meta is set
            const meta = tr.getMeta(suggestionsPluginKey);
            if (meta) {
              console.log('[Plugin State] Received meta with', meta.suggestions?.length, 'suggestions');
              return meta as SuggestionsState;
            }
            
            // Re-map suggestion ranges on document change
            if (!tr.docChanged) return state;
            
            console.log('[Plugin State] Document changed, remapping', state.suggestions.length, 'suggestions');
            
            const mapped = state.suggestions.map(s => ({
              ...s,
              absoluteFrom: tr.mapping.map(s.absoluteFrom),
              absoluteTo: tr.mapping.map(s.absoluteTo),
            }));
            
            return { ...state, suggestions: mapped };
          },
        },
        
        props: {
          decorations(state) {
            const pluginState = suggestionsPluginKey.getState(state);
            if (!pluginState) {
              console.log('[Decorations] No plugin state');
              return DecorationSet.empty;
            }
            
            const { suggestions } = pluginState;
            console.log('[Decorations] Processing', suggestions.length, 'suggestions');
            const decorations: Decoration[] = [];
            
            suggestions.forEach(s => {
              console.log(`[Decorations] Suggestion ${s.id}: stale=${s.stale}, range=[${s.absoluteFrom}:${s.absoluteTo}]`);
              if (!s.stale) {
                // Add inline highlight for the original range
                decorations.push(
                  Decoration.inline(s.absoluteFrom, s.absoluteTo, {
                    class: 'suggestion-highlight',
                    'data-suggestion-id': s.id,
                  })
                );
                
                // Create widget decoration at the end of the suggestion range
                const widget = document.createElement('div');
                widget.className = 'inline-suggestion-widget-container';
                widget.contentEditable = 'false';
                
                // Store view reference for callbacks
                widget.dataset.suggestionId = s.id;
                
                // Render React component
                const root = createRoot(widget);
                root.render(
                  InlineSuggestionWidget({
                    suggestion: s,
                    onAccept: (id: string) => {
                      // Get the editor from extension context
                      const editor = extension.editor;
                      if (editor) {
                        editor.commands.acceptSuggestion(id);
                      }
                    },
                    onReject: (id: string) => {
                      const editor = extension.editor;
                      if (editor) {
                        editor.commands.rejectSuggestion(id);
                      }
                    },
                  })
                );
                
                // Add widget decoration
                decorations.push(
                  Decoration.widget(s.absoluteTo, widget, {
                    side: 1,
                    key: `suggestion-${s.id}`,
                  })
                );
              } else {
                console.log(`[Decorations] Skipping stale suggestion ${s.id}`);
              }
            });
            
            console.log('[Decorations] Created', decorations.length, 'decorations');
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSuggestions: (suggestions: MappedSuggestion[], selectionStart: number) => ({ tr, dispatch }) => {
        console.log('[setSuggestions] Called with', suggestions.length, 'suggestions');
        console.log('[setSuggestions] First suggestion:', suggestions[0]);
        if (dispatch) {
          tr.setMeta(suggestionsPluginKey, { suggestions, selectionStart });
          console.log('[setSuggestions] Meta set on transaction');
        }
        return true;
      },

      acceptSuggestion: (id: string) => ({ state, tr, dispatch }) => {
        const pluginState = suggestionsPluginKey.getState(state);
        if (!pluginState) return false;
        
        const suggestion = pluginState.suggestions.find(s => s.id === id);
        if (!suggestion || suggestion.stale) return false;
        
        console.log('[acceptSuggestion] Applying:', {
          id,
          range: [suggestion.absoluteFrom, suggestion.absoluteTo],
          original: suggestion.original,
          replacement: suggestion.replacement
        });
        
        // Replace text with normalized content
        const textNode = state.schema.text(suggestion.replacement);
        tr.replaceWith(suggestion.absoluteFrom, suggestion.absoluteTo, textNode);
        
        // Remove from state
        const remaining = pluginState.suggestions.filter(s => s.id !== id);
        tr.setMeta(suggestionsPluginKey, { ...pluginState, suggestions: remaining });
        
        if (dispatch) {
          dispatch(tr);
          console.log('[acceptSuggestion] Dispatched successfully');
        }
        return true;
      },

      rejectSuggestion: (id: string) => ({ state, tr, dispatch }) => {
        const pluginState = suggestionsPluginKey.getState(state);
        if (!pluginState) return false;
        
        const remaining = pluginState.suggestions.filter(s => s.id !== id);
        tr.setMeta(suggestionsPluginKey, { ...pluginState, suggestions: remaining });
        
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
});

// React helper
export function mapSuggestionsToAbsolute(
  suggestions: Suggestion[],
  selectionStart: number,
  editor: any
): MappedSuggestion[] {
  console.log('[Mapping] selectionStart:', selectionStart);
  console.log('[Mapping] Total suggestions:', suggestions.length);
  
  return suggestions.map(s => {
    const absFrom = selectionStart + s.range.from;
    const absTo = selectionStart + s.range.to;
    const liveText = editor.state.doc.textBetween(absFrom, absTo, '\n');
    
    // Normalize whitespace for comparison
    const normalizedOriginal = s.original.replace(/\s+/g, ' ').trim();
    const normalizedLive = liveText.replace(/\s+/g, ' ').trim();
    // TEMPORARILY DISABLED - mark all as NOT stale to debug rendering
    const isStale = false; // normalizedLive !== normalizedOriginal;
    
    console.log(`[Mapping] Suggestion ${s.id}:`, {
      relativeRange: `[${s.range.from}:${s.range.to}]`,
      absoluteRange: `[${absFrom}:${absTo}]`,
      original: JSON.stringify(s.original),
      liveText: JSON.stringify(liveText),
      normalizedOriginal: JSON.stringify(normalizedOriginal),
      normalizedLive: JSON.stringify(normalizedLive),
      isStale,
      replacement: s.replacement.substring(0, 50) + (s.replacement.length > 50 ? '...' : '')
    });
    
    return {
      ...s,
      absoluteFrom: absFrom,
      absoluteTo: absTo,
      stale: isStale,
    };
  });
}

