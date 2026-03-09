import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export const MentionList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.id, label: item.name });
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: any) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    if (!props.items?.length) {
        return (
            <div className="bg-background/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 min-w-[200px] text-center text-sm text-muted-foreground m-0">
                {props.query.length < 2 ? "Type to search..." : (props.query ? "No results found" : "Loading...")}
            </div>
        );
    }

    return (
        <div className="bg-background/30 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/30 py-1 px-1.5 min-w-[180px] max-h-[300px] overflow-y-auto m-0">
            {props.items.map((item: any, index: number) => (
                <button
                    className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${index === selectedIndex ? 'bg-white/10 text-foreground' : 'text-foreground hover:bg-white/10'}`}
                    key={item.id}
                    onClick={() => selectItem(index)}
                >
                    <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 bg-muted/50 border border-border flex items-center justify-center">
                        {item.avatar ? (
                            <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-[10px] items-center justify-center font-medium text-muted-foreground">{item.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 text-left items-start">
                        <span className="font-medium truncate leading-tight w-full">{item.name}</span>
                        {item.role && <span className={`text-[10px] truncate leading-tight w-full ${index === selectedIndex ? 'text-foreground/70' : 'text-muted-foreground/60'}`}>{item.role}</span>}
                    </div>
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';
