package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type ConsentContract struct {
	contractapi.Contract
}

type ConsentProfile struct {
	CitizenID   string              `json:"citizenId"`
	Permissions map[string][]string `json:"permissions"`
	UpdatedAt   string              `json:"updatedAt"`
}

type ConsentEvent struct {
	CitizenID string   `json:"citizenId"`
	OrgID     string   `json:"orgId"`
	Action    string   `json:"action"`
	Fields    []string `json:"fields"`
	Timestamp string   `json:"timestamp"`
}

func (c *ConsentContract) getOrCreate(ctx contractapi.TransactionContextInterface,
	citizenId string) (*ConsentProfile, error) {

	key := "CONSENT_" + citizenId
	data, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, err
	}

	if data == nil {
		return &ConsentProfile{
			CitizenID:   citizenId,
			Permissions: make(map[string][]string),
			UpdatedAt:   fmt.Sprintf("%d", func() int64 { ts, _ := ctx.GetStub().GetTxTimestamp(); return ts.Seconds }()),
		}, nil
	}

	var profile ConsentProfile
	err = json.Unmarshal(data, &profile)
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (c *ConsentContract) GrantPermission(ctx contractapi.TransactionContextInterface,
	citizenId string, orgId string, fieldsJSON string) error {

	var fields []string
	err := json.Unmarshal([]byte(fieldsJSON), &fields)
	if err != nil {
		return fmt.Errorf("invalid fields JSON: %s", err.Error())
	}

	profile, err := c.getOrCreate(ctx, citizenId)
	if err != nil {
		return err
	}

	profile.Permissions[orgId] = fields
	profile.UpdatedAt = fmt.Sprintf("%d", func() int64 { ts, _ := ctx.GetStub().GetTxTimestamp(); return ts.Seconds }())

	key := "CONSENT_" + citizenId
	profileJSON, err := json.Marshal(profile)
	if err != nil {
		return err
	}

	event := ConsentEvent{
		CitizenID: citizenId,
		OrgID:     orgId,
		Action:    "GRANT",
		Fields:    fields,
		Timestamp: fmt.Sprintf("%d", func() int64 { ts, _ := ctx.GetStub().GetTxTimestamp(); return ts.Seconds }()),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ConsentGranted", eventJSON)

	return ctx.GetStub().PutState(key, profileJSON)
}

func (c *ConsentContract) DeclinePermission(ctx contractapi.TransactionContextInterface,
	citizenId string, orgId string) error {

	profile, err := c.getOrCreate(ctx, citizenId)
	if err != nil {
		return err
	}

	delete(profile.Permissions, orgId)
	profile.UpdatedAt = fmt.Sprintf("%d", func() int64 { ts, _ := ctx.GetStub().GetTxTimestamp(); return ts.Seconds }())

	key := "CONSENT_" + citizenId
	profileJSON, err := json.Marshal(profile)
	if err != nil {
		return err
	}

	event := ConsentEvent{
		CitizenID: citizenId,
		OrgID:     orgId,
		Action:    "DECLINE",
		Fields:    []string{},
		Timestamp: fmt.Sprintf("%d", func() int64 { ts, _ := ctx.GetStub().GetTxTimestamp(); return ts.Seconds }()),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ConsentDeclined", eventJSON)

	return ctx.GetStub().PutState(key, profileJSON)
}

func (c *ConsentContract) GetConsentedFields(ctx contractapi.TransactionContextInterface,
	citizenId string, orgId string) ([]string, error) {

	profile, err := c.getOrCreate(ctx, citizenId)
	if err != nil {
		return nil, err
	}

	fields, exists := profile.Permissions[orgId]
	if !exists {
		return []string{}, nil
	}
	return fields, nil
}

func (c *ConsentContract) GetConsentProfile(ctx contractapi.TransactionContextInterface,
	citizenId string) (*ConsentProfile, error) {

	return c.getOrCreate(ctx, citizenId)
}

func GetEffectiveFields(adminAllowed []string, citizenConsented []string) []string {
	adminSet := make(map[string]bool)
	for _, f := range adminAllowed {
		adminSet[f] = true
	}
	var effective []string
	for _, f := range citizenConsented {
		if adminSet[f] {
			effective = append(effective, f)
		}
	}
	if effective == nil {
		return []string{}
	}
	return effective
}

func main() {
	chaincode, err := contractapi.NewChaincode(&ConsentContract{})
	if err != nil {
		fmt.Printf("Error creating consent chaincode: %s", err.Error())
		return
	}
	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting consent chaincode: %s", err.Error())
	}
}
