import { forwardRef, useEffect, useState, useRef } from "react";
import { Divider, Card, Tag, Space, Spin, message, Button } from "antd";
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

const PAGE_SIZE = 5;

const ErrorCard: React.FC<Props> = forwardRef<any, Props>(({ subscription, topic, onShowEvent, refresh, expanded = false }, ref) => {
    const [list, setList] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const startRef = useRef(0);

    const fetchPage = async (start: number, append = false) => { 
     const setBusy = append ? setLoadingMore : setLoading;
     setBusy(true);
     try {
        const { data } = await eventSubscriptionApi.eventSubscriptionsErrorsGet(
            topic, 
            subscription, 
            PAGE_SIZE,
            start
        );
        setList(prev => append ? [...prev, ...data] : data);
        startRef.current = start + (Array.isArray(data) ? data.length : 0);
     } catch (e) {
        message.error(translations.somethingWentWrong);
     } finally {
        setBusy(false);
     }  
    }

    useEffect(() => {
        if(expanded) {
            startRef.current = 0;
            fetchPage(0);
        } else {
            setList([]);
            startRef.current = 0;
        }
    }, [subscription, topic, expanded]);

    const hasMore = list.length > 0 && list.length % PAGE_SIZE === 0;

    return (
        <Spin spinning={loading}>
            {list.map((item, index) => {
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
                                error={item._id}
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
                            {item.eventIds.map(eventId => (
                                <Tag key={eventId} onClick={() => onShowEvent(eventId, { topic, subscription })}>
                                    {typeof eventId === "string" ? `..${eventId.substr(-4)}` :  eventId}
                                </Tag>
                            ))}
                        </div>
                    </Card>
                );
            })}
            {hasMore && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                    <Button loading={loadingMore} onClick={() => fetchPage(startRef.current, true)}>
                        {translations.loadMore}
                    </Button>
                </div>
            )}
        </Spin>
    );
});

export default ErrorCard;
