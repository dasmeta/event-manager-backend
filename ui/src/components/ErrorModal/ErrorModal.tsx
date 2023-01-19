import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Divider, Modal, Tag } from "antd";
import omit from "lodash/omit";
import isEmpty from "lodash/isEmpty";
import ErrorActions from "../ErrorActions";
import { eventSubscriptionApi } from "@/services/api";

interface Props {
    onShowEvent: () => {};
    refresh: () => {};
}

const ErrorModal: React.FC<Props> = forwardRef<any, Props>(({ onShowEvent, refresh }, ref) => {
    const [visible, setVisible] = useState(false);
    const [list, setList] = useState<Array<any>>([]);
    const [topic, setTopic] = useState("");
    const [subscription, setSubscription] = useState("");

    useImperativeHandle(ref, () => ({
        open(topic: string, subscription: string) {
            setTopic(topic);
            setSubscription(subscription);
            setVisible(true);
            eventSubscriptionApi.eventSubscriptionsErrorsGet(topic, subscription).then(({ data }) => {
                setList(data);
            });
        },
    }));

    const close = useCallback(() => {
        setVisible(false);
        setList([]);
    }, []);

    return (
        <Modal visible={visible} onCancel={close} onOk={close} title={subscription} width={window.innerWidth * 0.7}>
            {list.slice(0, 5).map((item, index) => {
                const stack = item.error.stack;
                const error = omit(item.error, ["stack", "message"]);
                return (
                    <div key={index}>
                        <div style={{ display: "flex" }}>
                            <div style={{ flex: "auto" }}>
                                <strong>{item.count}</strong>
                                <Divider type="vertical" /> <span>{item._id}</span>
                            </div>
                            <div style={{ flex: "auto", textAlign: "right"}}>
                                <ErrorActions
                                    topic={topic}
                                    subscription={subscription}
                                    events={item.eventIds}
                                    refresh={refresh}
                                />
                            </div>
                        </div>

                        <br />

                        <div>
                            <pre dangerouslySetInnerHTML={{ __html: stack }} />
                        </div>

                        <div>{!isEmpty(error) && <pre>{JSON.stringify(error, null, 2)}</pre>}</div>

                        <div style={{ display: "flex", overflow: "hidden" }}>
                            {item.eventIds.slice(0, 20).map(eventId => (
                                <Tag key={eventId} onClick={() => onShowEvent(eventId, { topic, subscription })}>
                                    {typeof eventId === "string" ? `..${eventId.substr(-4)}` :  eventId}
                                </Tag>
                            ))}
                        </div>

                        <Divider />
                    </div>
                );
            })}
        </Modal>
    );
});

export default ErrorModal;