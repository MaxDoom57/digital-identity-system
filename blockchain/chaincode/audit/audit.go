package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type AuditContract struct {
	contractapi.Contract
}

type AuditEvent struct {
	EventID   string   `json:"eventId"`
	CitizenID string   `json:"citizenId"`
	OrgID     string   `json:"orgId"`
	EventType string   `json:"eventType"`
	Fields    []string `json:"fields"`
	IsOffline bool     `json:"isOffline"`
	Timestamp string   `json:"timestamp"`
}

func (c *AuditContract) LogEvent(ctx contractapi.TransactionContextInterface,
	eventId string, citizenId string, orgId string,
	eventType string, fieldsJSON string, isOfflineStr string, timestamp string) error {

	var fields []string
	if fieldsJSON != "" && fieldsJSON != "[]" {
		json.Unmarshal([]byte(fieldsJSON), &fields)
	}
	if fields == nil {
		fields = []string{}
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	timestamp = fmt.Sprintf("%d", txTimestamp.Seconds)

	isOffline := isOfflineStr == "true"

	event := AuditEvent{
		EventID:   eventId,
		CitizenID: citizenId,
		OrgID:     orgId,
		EventType: eventType,
		Fields:    fields,
		IsOffline: isOffline,
		Timestamp: timestamp,
	}

	key := fmt.Sprintf("AUDIT_%s_%s", citizenId, eventId)
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(key, eventJSON)
}

func (c *AuditContract) GetCitizenAuditLog(ctx contractapi.TransactionContextInterface,
	citizenId string) ([]*AuditEvent, error) {

	startKey := fmt.Sprintf("AUDIT_%s_", citizenId)
	endKey := fmt.Sprintf("AUDIT_%s_~", citizenId)

	iterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var events []*AuditEvent
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var event AuditEvent
		if err := json.Unmarshal(result.Value, &event); err != nil {
			continue
		}
		events = append(events, &event)
	}
	if events == nil {
		return []*AuditEvent{}, nil
	}
	return events, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&AuditContract{})
	if err != nil {
		fmt.Printf("Error creating audit chaincode: %s", err.Error())
		return
	}
	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting audit chaincode: %s", err.Error())
	}
}
