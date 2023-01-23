import { Tag } from "antd";
import { isAnomaly, isError, isFail, isMissing, isSuccess } from "@/utils/checker";
import translations from "@/assets/translations";
import styles from "./ItemStatusTags.less";

const ItemStatusTags = ({ item }: any) => {
    const status = [];
    if (isError(item)) {
        status.push(<Tag className={styles.borderRadius} color="error">{translations.error}</Tag>);
    }
    if (isFail(item)) {
        status.push(<Tag className={styles.borderRadius} color="default">{translations.fail}</Tag>);
    }
    if (isMissing(item)) {
        status.push(<Tag className={styles.borderRadius} color="warning">{translations.missing}</Tag>);
    }
    if (isAnomaly(item)) {
        status.push(<Tag className={styles.borderRadius} color="processing">{translations.anomaly}</Tag>);
    }
    if (isSuccess(item)) {
        status.push(<Tag className={styles.borderRadius} color="success">{translations.success}</Tag>);
    }

    return status;
};

export default ItemStatusTags;