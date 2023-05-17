import { useEffect, useState } from "react";
import {Card, Spin, message} from "antd";
import moment from "moment";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";
import styles from "./ErrorStackCard.less";

interface Props {
    eventId: string;
    subscription: string;
    expanded: boolean;
    onShowEvent: () => {};
    refresh: () => {};
}

const ErrorStackCard: React.FC<Props> = ({ subscription, eventId }) => {
    const [data, setData] = useState<{[key: string]: any}>({});
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
            setLoading(true);
            eventSubscriptionApi.eventSubscriptionsGet(
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                { params: { subscription, eventId } }
            ).then(({ data }) => {
                setData((data[0] || {}).error);
                setLastUpdated((data[0] || {}).updatedAt);
                setLoading(false);
            })
            .catch(() => {
                message.error(translations.somethingWentWrong);
            });;
    }, [subscription, eventId]);

    return (
        <Spin spinning={loading}>
            <span>{translations.lastUpdated}: {moment(lastUpdated).format('YYYY-MM-DD HH:mm:ss')}</span>
            <Card
                className={styles.eventCard}
                type="inner"
            >
                <div>
                    <pre style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: data.stack }} />
                </div>
            </Card>
        </Spin>
    );
};

export default ErrorStackCard;
