package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type IdentityContract struct {
	contractapi.Contract
}

type DigitalIdentity struct {
	CitizenID     string `json:"citizenId"`
	DID           string `json:"did"`
	FullName      string `json:"fullName"`
	NICNumber     string `json:"nicNumber"`
	BiometricHash string `json:"biometricHash"`
	IPFSCid       string `json:"ipfsCid"`
	IsActive      bool   `json:"isActive"`
	CreatedAt     string `json:"createdAt"`
}

func (c *IdentityContract) CreateIdentity(ctx contractapi.TransactionContextInterface,
	citizenId string, did string, fullName string, nicNumber string,
	biometricHash string, ipfsCid string) error {

	existing, _ := ctx.GetStub().GetState(did)
	if existing != nil {
		return fmt.Errorf("identity with DID %s already exists", did)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}

	identity := DigitalIdentity{
		CitizenID:     citizenId,
		DID:           did,
		FullName:      fullName,
		NICNumber:     nicNumber,
		BiometricHash: biometricHash,
		IPFSCid:       ipfsCid,
		IsActive:      true,
		CreatedAt:     fmt.Sprintf("%d", txTimestamp.Seconds),
	}

	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(did, identityJSON)
}

func (c *IdentityContract) GetIdentity(ctx contractapi.TransactionContextInterface,
	did string) (*DigitalIdentity, error) {

	identityJSON, err := ctx.GetStub().GetState(did)
	if err != nil {
		return nil, err
	}
	if identityJSON == nil {
		return nil, fmt.Errorf("identity with DID %s does not exist", did)
	}

	var identity DigitalIdentity
	err = json.Unmarshal(identityJSON, &identity)
	if err != nil {
		return nil, err
	}

	return &identity, nil
}

func (c *IdentityContract) RevokeIdentity(ctx contractapi.TransactionContextInterface,
	did string) error {

	identity, err := c.GetIdentity(ctx, did)
	if err != nil {
		return err
	}

	identity.IsActive = false
	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(did, identityJSON)
}

func (c *IdentityContract) IdentityExists(ctx contractapi.TransactionContextInterface,
	did string) (bool, error) {

	identityJSON, err := ctx.GetStub().GetState(did)
	if err != nil {
		return false, err
	}

	return identityJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&IdentityContract{})
	if err != nil {
		fmt.Printf("Error creating identity chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting identity chaincode: %s", err.Error())
	}
}