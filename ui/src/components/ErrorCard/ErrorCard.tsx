import { forwardRef, useEffect, useState } from "react";
import { Divider, Card, Tag, Space, Spin, message } from "antd";
import omit from "lodash/omit";
import isEmpty from "lodash/isEmpty";
import translations from "@/assets/translations";
import ErrorActions from "../ErrorActions";
import { eventSubscriptionApi } from "@/services/api";
import styles from "./EventCard.less";

interface Props {
    topic: string;
    subscription: string;
    expanded: boolean;
    onShowEvent: () => {};
    refresh: () => {};
}

const ErrorCard: React.FC<Props> = forwardRef<any, Props>(({ subscription, topic, onShowEvent, refresh, expanded = false }, ref) => {
    const [list, setList] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(expanded) {
            setLoading(true);
            eventSubscriptionApi.eventSubscriptionsErrorsGet(topic, subscription).then(({ data }) => {
                setList(data);
                setLoading(false);
            })
            .catch(() => {
                message.error(translations.somethingWentWrong);
            });
        } else {
            setList([]);
        }
    }, [subscription, topic, expanded]);

    return (
        <Spin spinning={loading}>
            {list.sort((a, b) => b.count - a.count).map((item, index) => {
                const stack = item.error.stack;
                const error = omit(item.error, ["stack", "message"]);
                return (
                    <Card
                        className={styles.eventCard}
                        key={index}
                        type="inner"
                        title={
                            <Space wrap size={[8, 8]} split={<Divider type="vertical" />}>
                                <strong>{item.count}</strong>
                                <span>{item._id}</span>
                            </Space>
                        }
                        extra={
                            <ErrorActions
                                topic={topic}
                                subscription={subscription}
                                events={item.eventIds}
                                refresh={refresh}
                            />
                        }
                    >
                        <div>
                            <pre style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: stack }} />
                        </div>

                        <div>{!isEmpty(error) && <pre>{JSON.stringify(error, null, 2)}</pre>}</div>

                        <div className={styles.eventTags}>
                            {item.eventIds.slice(0, 20).map(eventId => (
                                <Tag key={eventId} onClick={() => onShowEvent(eventId, { topic, subscription })}>
                                    {typeof eventId === "string" ? `..${eventId.substr(-4)}` :  eventId}
                                </Tag>
                            ))}
                        </div>
                    </Card>
                );
            })}
        </Spin>
    );
});

export default ErrorCard;
